package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.*;
import ma.ensam.fame.factory.CampaignFactory;
import ma.ensam.fame.repository.*;
import ma.ensam.fame.security.FameUserPrincipal;
import ma.ensam.fame.realtime.RealtimeService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class CampaignService {

    private final CampaignRepository campaignRepository;
    private final CompanyRepository companyRepository;
    private final CampaignMemberRepository memberRepository;
    private final AppUserRepository userRepository;
    private final CampaignAccessService accessService;
    private final AuditService audit;
    private final RealtimeService realtime;
    private final CampaignFactory campaignFactory;

    public CampaignService(CampaignRepository campaignRepository,
                           CompanyRepository companyRepository,
                           CampaignMemberRepository memberRepository,
                           AppUserRepository userRepository,
                           CampaignAccessService accessService,
                           AuditService audit,
                           RealtimeService realtime,
                           CampaignFactory campaignFactory) {
        this.campaignRepository = campaignRepository;
        this.companyRepository = companyRepository;
        this.memberRepository = memberRepository;
        this.userRepository = userRepository;
        this.accessService = accessService;
        this.audit = audit;
        this.realtime = realtime;
        this.campaignFactory = campaignFactory;
    }

    @Transactional
    public Campaign create(CreateCampaignRequest req, FameUserPrincipal owner) {
        Company company = companyRepository.findById(req.companyId())
                .orElseThrow(() -> ApiException.notFound("COMPANY_NOT_FOUND", "Company not found"));

        AppUser ownerUser = userRepository.findById(owner.id()).orElseThrow();
        Campaign campaign = campaignFactory.create(new CampaignFactory.Context(
                company, ownerUser, req.name(), req.description(), req.location(),
                req.startsAt(), req.endsAt()));
        campaign = campaignRepository.save(campaign);

        // Owner becomes a member automatically.
        memberRepository.save(new CampaignMember(campaign.getId(), owner.id()));

        audit.record(campaign.getId(), "CAMPAIGN", campaign.getId().toString(), "CREATED",
                Map.of("name", campaign.getName()));
        return campaign;
    }

    @Transactional(readOnly = true)
    public List<Campaign> listAccessible(FameUserPrincipal user) {
        if (user.role() == Role.ADMIN) {
            return campaignRepository.findByStatusInOrderByCreatedAtDesc(
                    List.of(CampaignStatus.DRAFT, CampaignStatus.ACTIVE,
                            CampaignStatus.PAUSED, CampaignStatus.CLOSED));
        }
        return memberRepository.findByUserId(user.id()).stream()
                .map(m -> campaignRepository.findById(m.getId().getCampaignId()).orElse(null))
                .filter(c -> c != null && c.getStatus() != CampaignStatus.ARCHIVED)
                .toList();
    }

    @Transactional(readOnly = true)
    public Campaign get(UUID campaignId, FameUserPrincipal user) {
        return accessService.requireCampaignAccess(campaignId, user);
    }

    @Transactional
    public Campaign update(UUID campaignId, UpdateCampaignRequest req, FameUserPrincipal user) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, user);
        if (req.name() != null) campaign.setName(req.name());
        if (req.description() != null) campaign.setDescription(req.description());
        if (req.location() != null) campaign.setLocation(req.location());
        if (req.startsAt() != null) campaign.setStartsAt(req.startsAt());
        if (req.endsAt() != null) campaign.setEndsAt(req.endsAt());
        campaign = campaignRepository.save(campaign);
        audit.record(campaignId, "CAMPAIGN", campaignId.toString(), "UPDATED", Map.of());
        return campaign;
    }

    @Transactional
    public Campaign transition(UUID campaignId, CampaignStatus target, FameUserPrincipal user) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, user);
        CampaignStatus from = campaign.getStatus();
        if (!validTransition(from, target)) {
            throw ApiException.conflict("INVALID_CAMPAIGN_TRANSITION",
                    "Cannot transition campaign from " + from + " to " + target);
        }
        campaign.setStatus(target);
        campaign = campaignRepository.save(campaign);
        audit.record(campaignId, "CAMPAIGN", campaignId.toString(), "STATUS_" + target.name(), Map.of());
        realtime.publishToCampaign(campaignId, "CAMPAIGN_UPDATED", Map.of("status", target.name()));
        return campaign;
    }

    private boolean validTransition(CampaignStatus from, CampaignStatus to) {
        return switch (from) {
            case DRAFT -> to == CampaignStatus.ACTIVE || to == CampaignStatus.ARCHIVED;
            case ACTIVE -> to == CampaignStatus.PAUSED || to == CampaignStatus.CLOSED;
            case PAUSED -> to == CampaignStatus.ACTIVE || to == CampaignStatus.CLOSED;
            case CLOSED -> to == CampaignStatus.ARCHIVED;
            case ARCHIVED -> false;
        };
    }

    @Transactional
    public void assignMember(UUID campaignId, UUID userId, FameUserPrincipal actor) {
        accessService.requireCampaignAccess(campaignId, actor);
        if (!userRepository.existsById(userId)) {
            throw ApiException.notFound("USER_NOT_FOUND", "User not found");
        }
        if (!memberRepository.existsByCampaignIdAndUserId(campaignId, userId)) {
            memberRepository.save(new CampaignMember(campaignId, userId));
            audit.record(campaignId, "CAMPAIGN_MEMBER", userId.toString(), "MEMBER_ADDED", Map.of());
        }
    }

    @Transactional
    public void removeMember(UUID campaignId, UUID userId, FameUserPrincipal actor) {
        accessService.requireCampaignAccess(campaignId, actor);
        memberRepository.deleteByCampaignIdAndUserId(campaignId, userId);
        audit.record(campaignId, "CAMPAIGN_MEMBER", userId.toString(), "MEMBER_REMOVED", Map.of());
    }

    @Transactional(readOnly = true)
    public List<AppUser> members(UUID campaignId, FameUserPrincipal actor) {
        accessService.requireCampaignAccess(campaignId, actor);
        return memberRepository.findByCampaignId(campaignId).stream()
                .map(m -> userRepository.findById(m.getId().getUserId()).orElse(null))
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    public record CreateCampaignRequest(UUID companyId, String name, String description,
                                        String location, Instant startsAt, Instant endsAt) {
    }

    public record UpdateCampaignRequest(String name, String description, String location,
                                        Instant startsAt, Instant endsAt) {
    }
}
