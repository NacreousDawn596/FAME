package ma.ensam.fame.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "roster_entry", uniqueConstraints = {
        @UniqueConstraint(name = "uq_roster_identity", columnNames = {"campaign_id", "student_code"})
})
@Getter
@Setter
@NoArgsConstructor
public class RosterEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    /** Normalized institutional identifier (CNE / Masar code). */
    @Column(name = "student_code", nullable = false, length = 64)
    private String studentCode;

    @Column(name = "email", length = 320)
    private String email;

    @Column(name = "full_name", length = 200)
    private String fullName;

    /** Academic program / filière (e.g. "Génie Informatique"). */
    @Column(name = "filiere", length = 200)
    private String filiere;

    @Column(name = "import_batch", length = 64)
    private String importBatch;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
