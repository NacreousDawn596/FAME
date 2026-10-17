package ma.ensam.fame.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import ma.ensam.fame.security.CurrentUser;
import ma.ensam.fame.service.AuthService;
import ma.ensam.fame.service.CampaignAccessService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/campaigns/{campaignId}/recovery")
public class RecoveryController {

    private final AuthService authService;
    private final CampaignAccessService accessService;

    public RecoveryController(AuthService authService, CampaignAccessService accessService) {
        this.authService = authService;
        this.accessService = accessService;
    }

    /** Organizer issues a one-time emergency credential after physical ID check. */
    @PostMapping
    public Map<String, Object> issue(@PathVariable UUID campaignId,
                                     @Valid @RequestBody IssueRequest body) {
        accessService.requireCampaignAccess(campaignId, CurrentUser.staff());
        AuthService.RecoveryIssued issued = authService.createRecovery(campaignId, body.studentCode());
        // Credentials are returned exactly once; they are never stored plaintext.
        return Map.of("username", issued.username(), "password", issued.password());
    }

    public record IssueRequest(@NotBlank String studentCode) {
    }
}
