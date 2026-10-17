package ma.ensam.fame.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "auth_challenge")
@Getter
@Setter
@NoArgsConstructor
public class AuthChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Random unguessable challenge value (base64url). */
    @Column(name = "challenge", nullable = false, unique = true, length = 128)
    private String challenge;

    @Column(name = "nonce", nullable = false, length = 128)
    private String nonce;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    public boolean isConsumed() {
        return consumedAt != null;
    }

    public boolean isExpired(Instant now) {
        return now.isAfter(expiresAt);
    }
}
