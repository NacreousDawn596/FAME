package ma.ensam.fame.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "queue_event")
@Getter
@Setter
@NoArgsConstructor
public class QueueEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "campaign_id", nullable = false)
    private UUID campaignId;

    @Column(name = "entity_type", nullable = false, length = 40)
    private String entityType;

    @Column(name = "entity_id", length = 64)
    private String entityId;

    @Column(name = "actor_id", length = 64)
    private String actorId;

    @Column(name = "actor_role", length = 20)
    private String actorRole;

    @Column(name = "action", nullable = false, length = 80)
    private String action;

    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt = Instant.now();

    /** Sanitized, credential-free metadata (JSON string). */
    @Column(name = "metadata", columnDefinition = "text")
    private String metadata;
}
