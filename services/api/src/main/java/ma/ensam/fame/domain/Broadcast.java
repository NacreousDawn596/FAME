package ma.ensam.fame.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * A platform-wide (or campaign-scoped) notification broadcast composed by the
 * superadmin. Delivery is tracked per-recipient in {@link BroadcastRecipient}.
 */
@Entity
@Table(name = "broadcast")
@Getter
@Setter
@NoArgsConstructor
public class Broadcast {

    public enum Status { PENDING, SENDING, SENT, PARTIAL, FAILED, CANCELLED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "campaign_id")
    private UUID campaignId;

    @Column(nullable = false, length = 80)
    private String segment;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String body;

    @Column(length = 60)
    private String type;

    @Column(length = 300)
    private String route;

    @Column(length = 20)
    private String channel = "IN_APP";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Column(name = "target_count", nullable = false)
    private int targetCount = 0;

    @Column(name = "delivered_count", nullable = false)
    private int deliveredCount = 0;

    @Column(name = "failed_count", nullable = false)
    private int failedCount = 0;

    @Column(name = "actor_id", length = 120)
    private String actorId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "sent_at")
    private Instant sentAt;
}
