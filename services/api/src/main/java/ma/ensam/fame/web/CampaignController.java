package ma.ensam.fame.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import ma.ensam.fame.domain.Campaign;
import ma.ensam.fame.domain.CampaignStatus;
import ma.ensam.fame.domain.Company;
import ma.ensam.fame.domain.Recruiter;
import ma.ensam.fame.security.CurrentUser;
import ma.ensam.fame.service.CampaignService;
import ma.ensam.fame.service.CompanyService;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class CampaignController {

    private final CampaignService campaignService;
    private final CompanyService companyService;

    public CampaignController(CampaignService campaignService, CompanyService companyService) {
        this.campaignService = campaignService;
        this.companyService = companyService;
    }

    /* ------------------------------ Companies ------------------------- */

    @GetMapping("/companies")
    public List<Map<String, Object>> companies() {
        return companyService.list().stream().map(Views::company).toList();
    }

    @PostMapping("/admin/companies")
    public Map<String, Object> createCompany(@Valid @RequestBody CompanyRequest body) {
        Company c = companyService.create(body.name(), body.description(), body.logoUrl());
        return Views.company(c);
    }

    @PostMapping("/admin/companies/{companyId}/recruiters")
    public Map<String, Object> createRecruiter(@PathVariable UUID companyId,
                                               @Valid @RequestBody RecruiterRequest body) {
        Recruiter r = companyService.createRecruiter(companyId, body.fullName(), body.email(),
                body.title(), body.photoUrl());
        return Views.recruiter(r);
    }

    @GetMapping("/companies/{companyId}/recruiters")
    public List<Map<String, Object>> recruiters(@PathVariable UUID companyId) {
        return companyService.recruiters(companyId).stream().map(Views::recruiter).toList();
    }

    /* ------------------------------ Campaigns ------------------------- */

    @GetMapping("/campaigns")
    public List<Map<String, Object>> campaigns() {
        return campaignService.listAccessible(CurrentUser.staff()).stream().map(Views::campaign).toList();
    }

    @PostMapping("/admin/campaigns")
    public Map<String, Object> createCampaign(@Valid @RequestBody CampaignCreateRequest body) {
        Campaign c = campaignService.create(
                new CampaignService.CreateCampaignRequest(body.companyId(), body.name(), body.description(),
                        body.location(), body.startsAt(), body.endsAt()),
                CurrentUser.staff());
        return Views.campaign(c);
    }

    @GetMapping("/campaigns/{campaignId}")
    public Map<String, Object> getCampaign(@PathVariable UUID campaignId) {
        return Views.campaign(campaignService.get(campaignId, CurrentUser.staff()));
    }

    @PutMapping("/campaigns/{campaignId}")
    public Map<String, Object> updateCampaign(@PathVariable UUID campaignId,
                                              @RequestBody CampaignUpdateRequest body) {
        Campaign c = campaignService.update(campaignId,
                new CampaignService.UpdateCampaignRequest(body.name(), body.description(),
                        body.location(), body.startsAt(), body.endsAt()),
                CurrentUser.staff());
        return Views.campaign(c);
    }

    @PostMapping("/campaigns/{campaignId}/status")
    public Map<String, Object> transition(@PathVariable UUID campaignId,
                                          @Valid @RequestBody StatusRequest body) {
        Campaign c = campaignService.transition(campaignId, CampaignStatus.valueOf(body.status()), CurrentUser.staff());
        return Views.campaign(c);
    }

    /* ------------------------------ Members --------------------------- */

    @GetMapping("/campaigns/{campaignId}/members")
    public List<Map<String, String>> members(@PathVariable UUID campaignId) {
        return campaignService.members(campaignId, CurrentUser.staff()).stream()
                .map(u -> Map.of("id", u.getId().toString(), "username", u.getUsername(),
                        "displayName", u.getDisplayName(), "role", u.getRole().name()))
                .toList();
    }

    @PostMapping("/campaigns/{campaignId}/members/{userId}")
    public Map<String, Object> assignMember(@PathVariable UUID campaignId, @PathVariable UUID userId) {
        campaignService.assignMember(campaignId, userId, CurrentUser.staff());
        return Map.of("ok", true);
    }

    @DeleteMapping("/campaigns/{campaignId}/members/{userId}")
    public Map<String, Object> removeMember(@PathVariable UUID campaignId, @PathVariable UUID userId) {
        campaignService.removeMember(campaignId, userId, CurrentUser.staff());
        return Map.of("ok", true);
    }

    /* ------------------------------ DTOs ------------------------------ */

    public record CompanyRequest(@NotBlank String name, String description, String logoUrl) {
    }

    public record RecruiterRequest(@NotBlank String fullName, String email, String title, String photoUrl) {
    }

    public record CampaignCreateRequest(@NotBlank UUID companyId, @NotBlank String name,
                                        String description, String location,
                                        Instant startsAt, Instant endsAt) {
    }

    public record CampaignUpdateRequest(String name, String description, String location,
                                        Instant startsAt, Instant endsAt) {
    }

    public record StatusRequest(@NotBlank String status) {
    }
}
