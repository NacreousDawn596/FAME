package ma.ensam.fame.service;

import ma.ensam.fame.domain.QueueEvent;
import ma.ensam.fame.factory.AuditEventFactory;
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
 * Event construction is delegated to {@link AuditEventFactory}.
 */
@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final QueueEventRepository repository;
    private final AuditEventFactory eventFactory;

    public AuditService(QueueEventRepository repository, AuditEventFactory eventFactory) {
        this.repository = repository;
        this.eventFactory = eventFactory;
    }

    public void record(UUID campaignId, String entityType, String entityId,
                       String action, Map<String, Object> metadata) {
        try {
            QueueEvent event = eventFactory.create(
                    campaignId, entityType, entityId, actorId(), actorRole(), action, metadata);
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
