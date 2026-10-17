package ma.ensam.fame.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import ma.ensam.fame.domain.Campaign;
import ma.ensam.fame.domain.StudentRegistration;
import ma.ensam.fame.security.CurrentUser;
import ma.ensam.fame.service.CampaignAccessService;
import ma.ensam.fame.service.QueueEngine;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/campaigns/{campaignId}")
public class QueueController {

    private final QueueEngine queueEngine;
    private final CampaignAccessService accessService;

    public QueueController(QueueEngine queueEngine, CampaignAccessService accessService) {
        this.queueEngine = queueEngine;
        this.accessService = accessService;
    }

    @GetMapping("/queue/counts")
    public Map<String, Long> counts(@PathVariable UUID campaignId) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, CurrentUser.staff());
        return queueEngine.counts(campaign);
    }

    @GetMapping("/queue/next")
    public List<Map<String, Object>> next(@PathVariable UUID campaignId, @RequestParam String filiere) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, CurrentUser.staff());
        return queueEngine.nextCandidates(campaign, filiere).stream().map(Views::registration).toList();
    }

    @GetMapping("/queue/alternatives")
    public List<Map<String, Object>> alternatives(@PathVariable UUID campaignId, @RequestParam String filiere) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, CurrentUser.staff());
        return queueEngine.alternativeCandidates(campaign, filiere).stream().map(Views::registration).toList();
    }

    @PostMapping("/queue/call")
    public Map<String, Object> call(@PathVariable UUID campaignId, @Valid @RequestBody CallRequest body) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, CurrentUser.staff());
        Optional<StudentRegistration> called = queueEngine.call(campaign, body.stationId());
        if (called.isEmpty()) {
            return Map.of("called", false, "empty", true);
        }
        return Map.of("called", true, "registration", Views.registration(called.get()));
    }

    @PostMapping("/queue/{registrationId}/prepare")
    public Map<String, Object> prepare(@PathVariable UUID campaignId, @PathVariable UUID registrationId,
                                       @Valid @RequestBody CallRequest body) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, CurrentUser.staff());
        queueEngine.prepareDispatch(campaign, registrationId, body.stationId());
        return Map.of("ok", true);
    }

    @PostMapping("/queue/{registrationId}/confirm")
    public Map<String, Object> confirm(@PathVariable UUID campaignId, @PathVariable UUID registrationId,
                                       @Valid @RequestBody CallRequest body) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, CurrentUser.staff());
        queueEngine.confirmPresence(campaign, registrationId, body.stationId());
        return Map.of("ok", true);
    }

    @PostMapping("/queue/{registrationId}/absent")
    public Map<String, Object> absent(@PathVariable UUID campaignId, @PathVariable UUID registrationId) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, CurrentUser.staff());
        queueEngine.markAbsent(campaign, registrationId);
        return Map.of("ok", true);
    }

    @PostMapping("/queue/{registrationId}/complete")
    public Map<String, Object> complete(@PathVariable UUID campaignId, @PathVariable UUID registrationId) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, CurrentUser.staff());
        queueEngine.completeInterview(campaign, registrationId);
        return Map.of("ok", true);
    }

    @PostMapping("/queue/{registrationId}/reschedule")
    public Map<String, Object> reschedule(@PathVariable UUID campaignId, @PathVariable UUID registrationId) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, CurrentUser.staff());
        queueEngine.reschedule(campaign, registrationId);
        return Map.of("ok", true);
    }

    @PostMapping("/queue/prealert")
    public Map<String, Object> preAlert(@PathVariable UUID campaignId) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, CurrentUser.staff());
        List<StudentRegistration> next = queueEngine.preAlertTopThree(campaign);
        return Map.of("preAlerted", next.size());
    }

    @PostMapping("/stations/{stationId}/filiere")
    public Map<String, Object> setFiliere(@PathVariable UUID campaignId, @PathVariable UUID stationId,
                                          @Valid @RequestBody FiliereRequest body) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, CurrentUser.staff());
        queueEngine.setStationFiliere(campaign, stationId, body.filiere());
        return Map.of("ok", true);
    }

    @PostMapping("/stations/{stationId}/pause")
    public Map<String, Object> pause(@PathVariable UUID campaignId, @PathVariable UUID stationId) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, CurrentUser.staff());
        queueEngine.pauseStation(campaign, stationId);
        return Map.of("ok", true);
    }

    @PostMapping("/stations/{stationId}/resume")
    public Map<String, Object> resume(@PathVariable UUID campaignId, @PathVariable UUID stationId) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, CurrentUser.staff());
        queueEngine.resumeStation(campaign, stationId);
        return Map.of("ok", true);
    }

    public record CallRequest(@NotBlank UUID stationId) {
    }

    public record FiliereRequest(@NotBlank String filiere) {
    }
}
