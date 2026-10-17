package ma.ensam.fame.web;

import ma.ensam.fame.security.CurrentUser;
import ma.ensam.fame.service.AnalyticsService;
import ma.ensam.fame.service.ExportService;
import ma.ensam.fame.repository.QueueEventRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/campaigns/{campaignId}")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final ExportService exportService;
    private final QueueEventRepository eventRepository;

    public AnalyticsController(AnalyticsService analyticsService,
                               ExportService exportService,
                               QueueEventRepository eventRepository) {
        this.analyticsService = analyticsService;
        this.exportService = exportService;
        this.eventRepository = eventRepository;
    }

    @GetMapping("/analytics")
    public AnalyticsService.AnalyticsResult analytics(@PathVariable UUID campaignId) {
        return analyticsService.analyze(campaignId, CurrentUser.staff());
    }

    @GetMapping("/events")
    public List<Map<String, Object>> events(@PathVariable UUID campaignId, @RequestParam(defaultValue = "100") int limit) {
        return eventRepository.findByCampaignIdOrderByOccurredAtDesc(campaignId, PageRequest.of(0, limit))
                .stream()
                .map(e -> {
                    Map<String, Object> m = new java.util.LinkedHashMap<>();
                    m.put("id", e.getId().toString());
                    m.put("entityType", e.getEntityType());
                    m.put("entityId", e.getEntityId());
                    m.put("actorRole", e.getActorRole());
                    m.put("action", e.getAction());
                    m.put("occurredAt", e.getOccurredAt().toString());
                    return m;
                })
                .toList();
    }

    @GetMapping("/export/registrations")
    public ResponseEntity<String> exportRegistrations(@PathVariable UUID campaignId,
                                                      @RequestParam(defaultValue = "csv") String format) {
        String content = exportService.exportRegistrations(campaignId, CurrentUser.staff(), format);
        return exportResponse(content, format, "registrations");
    }

    @GetMapping("/export/analytics")
    public ResponseEntity<String> exportAnalytics(@PathVariable UUID campaignId,
                                                  @RequestParam(defaultValue = "json") String format) {
        String content = exportService.exportAnalytics(campaignId, CurrentUser.staff(), format);
        return exportResponse(content, format, "analytics");
    }

    private ResponseEntity<String> exportResponse(String content, String format, String kind) {
        String ext = "json".equalsIgnoreCase(format) ? "json" : "csv";
        MediaType type = "json".equalsIgnoreCase(format)
                ? MediaType.APPLICATION_JSON
                : MediaType.parseMediaType("text/csv");
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + kind + "." + ext + "\"")
                .contentType(type)
                .body(content);
    }
}
