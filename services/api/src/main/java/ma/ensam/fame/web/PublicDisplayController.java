package ma.ensam.fame.web;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.Campaign;
import ma.ensam.fame.domain.QueueStatus;
import ma.ensam.fame.domain.StudentRegistration;
import ma.ensam.fame.repository.StudentRegistrationRepository;
import ma.ensam.fame.service.CampaignAccessService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/public")
public class PublicDisplayController {

    private final CampaignAccessService accessService;
    private final StudentRegistrationRepository registrationRepository;

    public PublicDisplayController(CampaignAccessService accessService,
                                   StudentRegistrationRepository registrationRepository) {
        this.accessService = accessService;
        this.registrationRepository = registrationRepository;
    }

    /** Minimal public campaign info for the QR landing / registration page. */
    @GetMapping("/campaigns/{campaignId}")
    public Map<String, Object> publicInfo(@PathVariable UUID campaignId) {
        Campaign campaign = accessService.requireCampaign(campaignId);
        return Map.of(
                "id", campaign.getId().toString(),
                "name", campaign.getName(),
                "location", campaign.getLocation(),
                "status", campaign.getStatus().name(),
                "companyName", campaign.getCompany().getName());
    }

    /** Restricted, read-only public display feed. Never exposes identities. */
    @GetMapping("/campaigns/{campaignId}/display")
    public List<Map<String, Object>> display(@PathVariable UUID campaignId) {
        Campaign campaign = accessService.requireCampaign(campaignId);
        if (!campaign.isPublicDisplayEnabled()) {
            throw ApiException.forbidden("PUBLIC_DISPLAY_DISABLED", "Public display is disabled");
        }
        List<StudentRegistration> current = registrationRepository
                .findByCampaignAndStatusInOrderBySequence(campaignId,
                        List.of(QueueStatus.CALLED, QueueStatus.DISPATCH_READY, QueueStatus.IN_INTERVIEW));
        return current.stream().map(r -> Views.publicCandidate(r, campaign.getPublicDisplayMode())).toList();
    }
}
