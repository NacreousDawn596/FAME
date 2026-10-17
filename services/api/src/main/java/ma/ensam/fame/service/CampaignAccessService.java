package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.Campaign;
import ma.ensam.fame.domain.Role;
import ma.ensam.fame.repository.CampaignMemberRepository;
import ma.ensam.fame.repository.CampaignRepository;
import ma.ensam.fame.security.FameUserPrincipal;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Centralized campaign-level authorization. Administrators have global access;
 * organizers may only access campaigns they are explicitly assigned to.
 */
@Service
public class CampaignAccessService {

    private final CampaignRepository campaignRepository;
    private final CampaignMemberRepository memberRepository;

    public CampaignAccessService(CampaignRepository campaignRepository,
                                 CampaignMemberRepository memberRepository) {
        this.campaignRepository = campaignRepository;
        this.memberRepository = memberRepository;
    }

    /** Loads a campaign and asserts the given staff user may access it. */
    public Campaign requireCampaignAccess(UUID campaignId, FameUserPrincipal user) {
        Campaign campaign = campaignRepository.findById(campaignId)
                .orElseThrow(() -> ApiException.notFound("CAMPAIGN_NOT_FOUND", "Campaign not found"));

        if (user.role() == Role.ADMIN) {
            return campaign;
        }
        if (!memberRepository.existsByCampaignIdAndUserId(campaignId, user.id())) {
            throw ApiException.forbidden("CAMPAIGN_FORBIDDEN", "Not authorized for this campaign");
        }
        return campaign;
    }

    public boolean canAccess(UUID campaignId, FameUserPrincipal user) {
        if (user.role() == Role.ADMIN) {
            return campaignRepository.existsById(campaignId);
        }
        return memberRepository.existsByCampaignIdAndUserId(campaignId, user.id());
    }

    public Campaign requireCampaign(UUID campaignId) {
        return campaignRepository.findById(campaignId)
                .orElseThrow(() -> ApiException.notFound("CAMPAIGN_NOT_FOUND", "Campaign not found"));
    }
}
