package ma.ensam.fame.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Organizer-issued emergency fallback credential for a student who cannot
 * authenticate through SchoolApp. Created only after physical identity
 * verification; the temporary password must be replaced on first use.
 */
@Entity
@Table(name = "recovery_account")
@Getter
@Setter
@NoArgsConstructor
public class RecoveryAccount {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "campaign_id", nullable = false)
    private UUID campaignId;

    @Column(name = "student_code", nullable = false, length = 64)
    private String studentCode;

    @Column(length = 320)
    private String email;

    @Column(name = "full_name", length = 200)
    private String fullName;

    @Column(name = "filiere", length = 200)
    private String filiere;

    @Column(name = "username", nullable = false, unique = true, length = 64)
    private String username;

    @Column(name = "password_hash", nullable = false, length = 100)
    private String passwordHash;

    @Column(name = "must_change_password", nullable = false)
    private boolean mustChangePassword = true;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
