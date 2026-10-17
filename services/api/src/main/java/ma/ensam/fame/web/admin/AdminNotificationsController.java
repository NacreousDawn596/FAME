package ma.ensam.fame.web.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import ma.ensam.fame.domain.Broadcast;
import ma.ensam.fame.domain.BroadcastRecipient;
import ma.ensam.fame.domain.NotificationTemplate;
import ma.ensam.fame.security.CurrentUser;
import ma.ensam.fame.service.NotificationCommandService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminNotificationsController {

    private final NotificationCommandService commandService;

    public AdminNotificationsController(NotificationCommandService commandService) {
        this.commandService = commandService;
    }

    /* Templates */

    @GetMapping("/notifications/templates")
    public List<Map<String, Object>> templates() {
        return commandService.templates().stream().map(this::templateView).toList();
    }

    @PostMapping("/notifications/templates")
    public Map<String, Object> createTemplate(@Valid @RequestBody TemplateRequest body) {
        NotificationTemplate t = commandService.createTemplate(
                body.name(), body.title(), body.body(), body.type(), body.route());
        return templateView(t);
    }

    @PutMapping("/notifications/templates/{id}")
    public Map<String, Object> updateTemplate(@PathVariable UUID id, @RequestBody TemplateRequest body) {
        NotificationTemplate t = commandService.updateTemplate(
                id, body.title(), body.body(), body.type(), body.route(), body.active());
        return templateView(t);
    }

    @DeleteMapping("/notifications/templates/{id}")
    public Map<String, Object> deleteTemplate(@PathVariable UUID id) {
        commandService.deleteTemplate(id);
        return Map.of("ok", true);
    }

    /* Composer */

    @PostMapping("/notifications/preview")
    public Map<String, Object> preview(@Valid @RequestBody SendRequest body) {
        NotificationCommandService.TargetPreview preview =
                commandService.preview(body.segment(), body.campaignId(), body.specificIds());
        return Map.of("segment", preview.segment(), "count", preview.count());
    }

    @PostMapping("/notifications/send")
    public Map<String, Object> send(@Valid @RequestBody SendRequest body) {
        Broadcast broadcast = commandService.compose(
                body.segment(), body.campaignId(), body.specificIds(),
                body.title(), body.body(), body.type(), body.route(), CurrentUser.staff());
        return broadcastView(broadcast);
    }

    /* Delivery management */

    @GetMapping("/notifications")
    public List<Map<String, Object>> broadcasts(@RequestParam(defaultValue = "50") int limit) {
        return commandService.broadcasts(limit).stream().map(this::broadcastView).toList();
    }

    @GetMapping("/notifications/{id}")
    public Map<String, Object> broadcast(@PathVariable UUID id) {
        Broadcast b = commandService.broadcastDetail(id);
        List<Map<String, Object>> recipients = commandService.recipients(id).stream()
                .map(r -> Map.<String, Object>of(
                        "id", r.getId().toString(),
                        "registrationId", r.getRegistrationId().toString(),
                        "status", r.getStatus().name(),
                        "attempts", r.getAttempts(),
                        "sentAt", r.getSentAt() == null ? "" : r.getSentAt().toString(),
                        "lastError", r.getLastError() == null ? "" : r.getLastError()))
                .toList();
        Map<String, Object> view = new java.util.LinkedHashMap<>(broadcastView(b));
        view.put("recipients", recipients);
        return view;
    }

    private Map<String, Object> templateView(NotificationTemplate t) {
        return Map.of(
                "id", t.getId().toString(),
                "name", t.getName(),
                "title", t.getTitle(),
                "body", t.getBody(),
                "type", t.getType() == null ? "" : t.getType(),
                "route", t.getRoute() == null ? "" : t.getRoute(),
                "active", t.isActive());
    }

    private Map<String, Object> broadcastView(Broadcast b) {
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("id", b.getId().toString());
        m.put("campaignId", b.getCampaignId() == null ? "" : b.getCampaignId().toString());
        m.put("segment", b.getSegment());
        m.put("title", b.getTitle());
        m.put("body", b.getBody());
        m.put("type", b.getType() == null ? "" : b.getType());
        m.put("route", b.getRoute() == null ? "" : b.getRoute());
        m.put("channel", b.getChannel());
        m.put("status", b.getStatus().name());
        m.put("targetCount", b.getTargetCount());
        m.put("deliveredCount", b.getDeliveredCount());
        m.put("failedCount", b.getFailedCount());
        m.put("createdAt", b.getCreatedAt().toString());
        m.put("sentAt", b.getSentAt() == null ? "" : b.getSentAt().toString());
        return m;
    }

    public record TemplateRequest(@NotBlank String name, String title, String body,
                                  String type, String route, Boolean active) {
    }

    public record SendRequest(@NotBlank String segment, UUID campaignId, List<UUID> specificIds,
                              @NotBlank String title, String body, String type, String route) {
    }
}
