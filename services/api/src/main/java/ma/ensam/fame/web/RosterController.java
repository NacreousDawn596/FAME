package ma.ensam.fame.web;

import ma.ensam.fame.domain.RosterEntry;
import ma.ensam.fame.security.CurrentUser;
import ma.ensam.fame.service.RosterService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/campaigns/{campaignId}/roster")
public class RosterController {

    private final RosterService rosterService;

    public RosterController(RosterService rosterService) {
        this.rosterService = rosterService;
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Map<String, Object> importCsv(@PathVariable UUID campaignId,
                                         @RequestParam("file") MultipartFile file) {
        RosterService.ImportSummary summary = rosterService.importCsv(campaignId, file, CurrentUser.staff());
        return Map.of(
                "total", summary.total(),
                "imported", summary.imported(),
                "duplicates", summary.duplicates(),
                "errors", summary.errors(),
                "batchId", summary.batchId(),
                "errorDetails", summary.errorDetails());
    }

    @GetMapping
    public List<Map<String, String>> list(@PathVariable UUID campaignId) {
        List<RosterEntry> entries = rosterService.list(campaignId, CurrentUser.staff());
        return entries.stream().map(e -> Map.of(
                "studentCode", e.getStudentCode(),
                "email", e.getEmail() == null ? "" : e.getEmail(),
                "fullName", e.getFullName() == null ? "" : e.getFullName(),
                "filiere", e.getFiliere() == null ? "" : e.getFiliere())).toList();
    }

    @DeleteMapping
    public Map<String, Object> clear(@PathVariable UUID campaignId) {
        rosterService.delete(campaignId, CurrentUser.staff());
        return Map.of("ok", true);
    }
}
