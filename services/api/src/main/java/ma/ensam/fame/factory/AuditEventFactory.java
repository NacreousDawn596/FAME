package ma.ensam.fame.factory;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import ma.ensam.fame.domain.QueueEvent;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * Builds sanitized {@link QueueEvent} audit records. Centralizes metadata
 * serialization (credential-free) so the audit service only resolves the actor
 * and persists.
 */
@Component
public class AuditEventFactory {

    private final ObjectMapper objectMapper;

    public AuditEventFactory(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public QueueEvent create(UUID campaignId, String entityType, String entityId,
                             String actorId, String actorRole, String action,
                             Map<String, Object> metadata) throws JsonProcessingException {
        QueueEvent event = new QueueEvent();
        event.setCampaignId(campaignId);
        event.setEntityType(entityType);
        event.setEntityId(entityId);
        event.setActorId(actorId);
        event.setActorRole(actorRole);
        event.setAction(action);
        event.setMetadata(metadata == null ? null : objectMapper.writeValueAsString(metadata));
        return event;
    }
}
