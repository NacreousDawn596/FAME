package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.*;
import ma.ensam.fame.realtime.RealtimeService;
import ma.ensam.fame.repository.*;
import ma.ensam.fame.security.FameUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

/**
 * Notification Command Center: template management, audience targeting and
 * broadcast composition. Delivery is tracked per-recipient and completed
 * asynchronously by {@link BroadcastDeliveryWorker}.
 */
@Service
public class NotificationCommandService {

    private final NotificationTemplateRepository templateRepository;
    private final BroadcastRepository broadcastRepository;
    private final BroadcastRecipientRepository recipientRepository;
    private final StudentRegistrationRepository registrationRepository;
    private final CampaignAccessService accessService;
    private final RealtimeService realtime;
    private final AuditService audit;

    public NotificationCommandService(NotificationTemplateRepository templateRepository,
                                      BroadcastRepository broadcastRepository,
                                      BroadcastRecipientRepository recipientRepository,
                                      StudentRegistrationRepository registrationRepository,
                                      CampaignAccessService accessService,
                                      RealtimeService realtime,
                                      AuditService audit) {
        this.templateRepository = templateRepository;
        this.broadcastRepository = broadcastRepository;
        this.recipientRepository = recipientRepository;
        this.registrationRepository = registrationRepository;
        this.accessService = accessService;
        this.realtime = realtime;
        this.audit = audit;
    }

    /* ------------------------------ Templates ------------------------- */

    @Transactional(readOnly = true)
    public List<NotificationTemplate> templates() {
        return templateRepository.findByOrderByNameAsc();
    }

    @Transactional
    public NotificationTemplate createTemplate(String name, String title, String body,
                                               String type, String route) {
        if (templateRepository.findByName(name).isPresent()) {
            throw ApiException.conflict("TEMPLATE_EXISTS", "Template name already exists");
        }
        NotificationTemplate t = new NotificationTemplate();
        t.setName(name);
        t.setTitle(title);
        t.setBody(body);
        t.setType(type);
        t.setRoute(route);
        return templateRepository.save(t);
    }

    @Transactional
    public NotificationTemplate updateTemplate(UUID id, String title, String body,
                                               String type, String route, Boolean active) {
        NotificationTemplate t = templateRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("TEMPLATE_NOT_FOUND", "Template not found"));
        if (title != null) t.setTitle(title);
        if (body != null) t.setBody(body);
        if (type != null) t.setType(type);
        if (route != null) t.setRoute(route);
        if (active != null) t.setActive(active);
        return templateRepository.save(t);
    }

    @Transactional
    public void deleteTemplate(UUID id) {
        templateRepository.deleteById(id);
    }

    /* ------------------------------ Composer -------------------------- */

    @Transactional(readOnly = true)
    public TargetPreview preview(String segment, UUID campaignId, List<UUID> specificIds) {
        List<UUID> ids = resolveTargets(segment, campaignId, specificIds);
        return new TargetPreview(segment, ids.size());
    }

    @Transactional
    public Broadcast compose(String segment, UUID campaignId, List<UUID> specificIds,
                             String title, String body, String type, String route,
                             FameUserPrincipal actor) {
        List<StudentRegistration> targets = resolveRegistrations(segment, campaignId, specificIds);
        if (targets.isEmpty()) {
            throw ApiException.badRequest("NO_TARGETS", "No recipients match the selected audience");
        }

        Broadcast broadcast = new Broadcast();
        broadcast.setCampaignId(campaignId);
        broadcast.setSegment(segment);
        broadcast.setTitle(title);
        broadcast.setBody(body);
        broadcast.setType(type);
        broadcast.setRoute(route);
        broadcast.setChannel("PUSH_AND_IN_APP");
        broadcast.setStatus(Broadcast.Status.SENDING);
        broadcast.setTargetCount(targets.size());
        broadcast.setActorId("user:" + actor.id());
        broadcast = broadcastRepository.save(broadcast);

        for (StudentRegistration reg : targets) {
            BroadcastRecipient recipient = new BroadcastRecipient();
            recipient.setBroadcastId(broadcast.getId());
            recipient.setRegistrationId(reg.getId());
            recipient.setStatus(BroadcastRecipient.Status.PENDING);
            recipientRepository.save(recipient);

            // In-app delivery immediately via SSE.
            realtime.publishToStudent(reg.getId(), reg.getCampaign().getId(), "NOTIFICATION",
                    Map.of("title", title, "body", body, "type", type == null ? "ANNOUNCEMENT" : type));
        }

        audit.record(campaignId == null ? UUID.randomUUID() : campaignId, "BROADCAST",
                broadcast.getId().toString(), "NOTIFICATION_SENT",
                Map.of("segment", segment, "recipients", targets.size()));
        return broadcast;
    }

    @Transactional(readOnly = true)
    public List<Broadcast> broadcasts(int limit) {
        return broadcastRepository.findByOrderByCreatedAtDesc(
                org.springframework.data.domain.PageRequest.of(0, limit));
    }

    @Transactional(readOnly = true)
    public Broadcast broadcastDetail(UUID id) {
        return broadcastRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("BROADCAST_NOT_FOUND", "Broadcast not found"));
    }

    @Transactional(readOnly = true)
    public List<BroadcastRecipient> recipients(UUID broadcastId) {
        return recipientRepository.findByBroadcastIdOrderByStatusAsc(broadcastId);
    }

    /* ------------------------------ Targeting ------------------------- */

    private List<UUID> resolveTargets(String segment, UUID campaignId, List<UUID> specificIds) {
        return resolveRegistrations(segment, campaignId, specificIds).stream()
                .map(StudentRegistration::getId).toList();
    }

    private List<StudentRegistration> resolveRegistrations(String segment, UUID campaignId,
                                                           List<UUID> specificIds) {
        return switch (segment == null ? "" : segment) {
            case "SPECIFIC" -> specificIds == null ? List.of()
                    : registrationRepository.findAllById(specificIds);
            case "ALL" -> registrationRepository.findAll();
            case "CAMPAIGN_ALL" -> requireCampaign(campaignId) != null
                    ? registrationRepository.findByCampaignIdOrderBySequenceNoAsc(campaignId)
                    : List.of();
            case "WAITING" -> registrationRepository.findByCampaignAndStatusInOrderBySequence(
                    campaignId, List.of(QueueStatus.WAITING, QueueStatus.APPROACHING));
            case "CALLED" -> registrationRepository.findByCampaignAndStatusInOrderBySequence(
                    campaignId, List.of(QueueStatus.CALLED, QueueStatus.DISPATCH_READY));
            case "IN_INTERVIEW" -> registrationRepository.findByCampaignAndStatusInOrderBySequence(
                    campaignId, List.of(QueueStatus.IN_INTERVIEW));
            case "ELIGIBLE_NOT_REGISTERED" -> eligibleNotRegistered(campaignId);
            default -> throw ApiException.badRequest("UNKNOWN_SEGMENT", "Unknown audience segment: " + segment);
        };
    }

    private Campaign requireCampaign(UUID campaignId) {
        if (campaignId == null) return null;
        return accessService.requireCampaign(campaignId);
    }

    private List<StudentRegistration> eligibleNotRegistered(UUID campaignId) {
        // Eligible-but-not-registered students have no FAME session or push
        // subscription yet; reaching them requires the (not yet implemented)
        // email channel. Truthfully resolve to empty rather than fabricate.
        return List.of();
    }

    public record TargetPreview(String segment, int count) {
    }
}
