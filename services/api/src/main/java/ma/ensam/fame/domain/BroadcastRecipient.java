package ma.ensam.fame.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "broadcast_recipient", uniqueConstraints = {
        @UniqueConstraint(name = "uq_broadcast_recipient", columnNames = {"broadcast_id", "registration_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class BroadcastRecipient {

    public enum Status { PENDING, SENT, FAILED }

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "broadcast_id", nullable = false)
    private UUID broadcastId;

    @Column(name = "registration_id", nullable = false)
    private UUID registrationId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Column(nullable = false)
    private int attempts = 0;

    @Column(name = "sent_at")
    private Instant sentAt;

    @Column(name = "last_error", length = 500)
    private String lastError;
}
