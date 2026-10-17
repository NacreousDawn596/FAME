package ma.ensam.fame.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notification_record")
@Getter
@Setter
@NoArgsConstructor
public class NotificationRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "registration_id")
    private UUID registrationId;

    @Column(name = "event_type", nullable = false, length = 60)
    private String eventType;

    /** Deduplication key: unique per (registration, event). */
    @Column(name = "dedup_key", nullable = false, unique = true, length = 160)
    private String dedupKey;

    @Column(name = "payload", columnDefinition = "text")
    private String payload;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "attempts", nullable = false)
    private int attempts = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "last_error", length = 500)
    private String lastError;
}
