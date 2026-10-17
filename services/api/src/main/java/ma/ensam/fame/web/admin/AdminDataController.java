package ma.ensam.fame.web.admin;

import ma.ensam.fame.security.CurrentUser;
import ma.ensam.fame.service.AdminDataService;
import ma.ensam.fame.service.ExportService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/data")
public class AdminDataController {

    private final AdminDataService dataService;
    private final ExportService exportService;

    public AdminDataController(AdminDataService dataService, ExportService exportService) {
        this.dataService = dataService;
        this.exportService = exportService;
    }

    @GetMapping("/counts")
    public Map<String, Long> counts() {
        return dataService.entityCounts();
    }

    @PostMapping("/archive-closed-campaigns")
    public Map<String, Object> archiveClosed() {
        int archived = dataService.archiveClosedCampaigns(CurrentUser.staff().username());
        return Map.of("archived", archived);
    }

    @GetMapping("/campaigns/{campaignId}/export")
    public ResponseEntity<String> exportCampaign(@PathVariable UUID campaignId,
                                                 @RequestParam(defaultValue = "csv") String format) {
        String content = exportService.exportRegistrations(campaignId, CurrentUser.staff(), format);
        String ext = "json".equalsIgnoreCase(format) ? "json" : "csv";
        MediaType type = "json".equalsIgnoreCase(format)
                ? MediaType.APPLICATION_JSON : MediaType.parseMediaType("text/csv");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"campaign-" + campaignId + "." + ext + "\"")
                .contentType(type)
                .body(content);
    }
}
