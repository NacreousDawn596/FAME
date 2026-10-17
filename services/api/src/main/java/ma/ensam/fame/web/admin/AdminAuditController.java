package ma.ensam.fame.web.admin;

import ma.ensam.fame.domain.QueueEvent;
import ma.ensam.fame.repository.QueueEventRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Read-only audit interface. There is intentionally no delete/clear endpoint:
 * audit records are append-only and not modifiable through admin APIs.
 */
@RestController
@RequestMapping("/api/admin/audit")
public class AdminAuditController {

    private final QueueEventRepository eventRepository;

    public AdminAuditController(QueueEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @GetMapping
    public List<Map<String, Object>> list(@RequestParam(required = false) UUID campaignId,
                                          @RequestParam(required = false) String action,
                                          @RequestParam(defaultValue = "0") int page,
                                          @RequestParam(defaultValue = "50") int size) {
        List<QueueEvent> events;
        if (campaignId != null && action != null) {
            events = eventRepository.findByCampaignIdAndActionOrderByOccurredAtDesc(campaignId, action, PageRequest.of(page, size));
        } else if (campaignId != null) {
            events = eventRepository.findByCampaignIdOrderByOccurredAtDesc(campaignId, PageRequest.of(page, size));
        } else {
            events = eventRepository.findTop200ByOrderByOccurredAtDesc();
            int from = Math.min(page * size, events.size());
            int to = Math.min(from + size, events.size());
            events = from > to ? List.of() : events.subList(from, to);
        }
        return events.stream().map(this::view).toList();
    }

    @GetMapping("/export")
    public ResponseEntity<String> export(@RequestParam(required = false) UUID campaignId) {
        List<QueueEvent> events = campaignId != null
                ? eventRepository.findByCampaignIdOrderByOccurredAtDesc(campaignId, PageRequest.of(0, 10000))
                : eventRepository.findTop200ByOrderByOccurredAtDesc();
        StringBuilder sb = new StringBuilder("occurredAt,actorRole,action,entityType,entityId,campaignId\n");
        for (QueueEvent e : events) {
            sb.append(csv(e.getOccurredAt().toString())).append(',')
              .append(csv(e.getActorRole())).append(',')
              .append(csv(e.getAction())).append(',')
              .append(csv(e.getEntityType())).append(',')
              .append(csv(e.getEntityId())).append(',')
              .append(csv(e.getCampaignId() == null ? "" : e.getCampaignId().toString())).append('\n');
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"audit.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(sb.toString());
    }

    private Map<String, Object> view(QueueEvent e) {
        return Map.of(
                "id", e.getId().toString(),
                "campaignId", e.getCampaignId() == null ? "" : e.getCampaignId().toString(),
                "entityType", e.getEntityType(),
                "entityId", e.getEntityId() == null ? "" : e.getEntityId(),
                "actorId", e.getActorId() == null ? "" : e.getActorId(),
                "actorRole", e.getActorRole() == null ? "" : e.getActorRole(),
                "action", e.getAction(),
                "metadata", e.getMetadata() == null ? "" : e.getMetadata(),
                "occurredAt", e.getOccurredAt().toString());
    }

    /** Mitigates CSV formula injection. */
    private static String csv(String v) {
        if (v == null) return "";
        String s = v;
        if (s.startsWith("=") || s.startsWith("+") || s.startsWith("-") || s.startsWith("@") || s.startsWith("\t")) {
            s = "'" + s;
        }
        if (s.contains(",") || s.contains("\"") || s.contains("\n")) {
            s = "\"" + s.replace("\"", "\"\"") + "\"";
        }
        return s;
    }
}
