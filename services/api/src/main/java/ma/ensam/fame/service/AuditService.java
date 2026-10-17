package ma.ensam.fame.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.ensam.fame.domain.QueueEvent;
import ma.ensam.fame.repository.QueueEventRepository;
import ma.ensam.fame.security.CurrentUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

/**
 * Writes sanitized audit events. Never records credentials, tokens or personal
 * data beyond the minimal actor/entity identifiers required for auditability.
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final QueueEventRepository repository;
    private final ObjectMapper objectMapper;

    public AuditService(QueueEventRepository repository, ObjectMapper objectMapper) {
        this.repository = repository;
        this.objectMapper = objectMapper;
    }

    public void record(UUID campaignId, String entityType, String entityId,
                       String action, Map<String, Object> metadata) {
        try {
            QueueEvent event = new QueueEvent();
            event.setCampaignId(campaignId);
            event.setEntityType(entityType);
            event.setEntityId(entityId);
            event.setActorId(actorId());
            event.setActorRole(actorRole());
            event.setAction(action);
            event.setMetadata(metadata == null ? null : objectMapper.writeValueAsString(metadata));
            repository.save(event);
        } catch (Exception e) {
            log.error("Failed to record audit event", e);
        }
    }

    private String actorId() {
        try {
            var staff = CurrentUser.staff();
            return "user:" + staff.id();
        } catch (Exception e) {
            try {
                var student = CurrentUser.student();
                return "student:" + student.registrationId();
            } catch (Exception e2) {
                return "system";
            }
        }
    }

    private String actorRole() {
        try {
            var staff = CurrentUser.staff();
            return staff.role().name();
        } catch (Exception e) {
            try {
                CurrentUser.student();
                return "STUDENT";
            } catch (Exception e2) {
                return "SYSTEM";
            }
        }
    }
}
