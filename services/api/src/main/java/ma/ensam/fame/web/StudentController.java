package ma.ensam.fame.web;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.Campaign;
import ma.ensam.fame.domain.StudentRegistration;
import ma.ensam.fame.repository.StudentRegistrationRepository;
import ma.ensam.fame.security.CurrentUser;
import ma.ensam.fame.security.StudentPrincipal;
import ma.ensam.fame.service.CampaignAccessService;
import ma.ensam.fame.service.QueueEngine;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/student")
public class StudentController {

    private final StudentRegistrationRepository registrationRepository;
    private final CampaignAccessService accessService;
    private final QueueEngine queueEngine;

    public StudentController(StudentRegistrationRepository registrationRepository,
                             CampaignAccessService accessService,
                             QueueEngine queueEngine) {
        this.registrationRepository = registrationRepository;
        this.accessService = accessService;
        this.queueEngine = queueEngine;
    }

    @GetMapping("/me")
    public Map<String, Object> me() {
        StudentPrincipal s = CurrentUser.student();
        StudentRegistration reg = registrationRepository.findById(s.registrationId())
                .orElseThrow(() -> ApiException.notFound("REGISTRATION_NOT_FOUND", "Registration not found"));
        return Views.registration(reg);
    }

    @GetMapping("/campaign")
    public Map<String, Object> campaign() {
        StudentPrincipal s = CurrentUser.student();
        Campaign campaign = accessService.requireCampaign(s.campaignId());
        return Map.of(
                "name", campaign.getName(),
                "location", campaign.getLocation(),
                "companyName", campaign.getCompany().getName(),
                "status", campaign.getStatus().name());
    }

    @PostMapping("/withdraw")
    public Map<String, Object> withdraw() {
        StudentPrincipal s = CurrentUser.student();
        Campaign campaign = accessService.requireCampaign(s.campaignId());
        queueEngine.withdraw(campaign, s.registrationId());
        return Map.of("ok", true);
    }
}
