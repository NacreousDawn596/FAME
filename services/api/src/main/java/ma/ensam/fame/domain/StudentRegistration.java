package ma.ensam.fame.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "student_registration", uniqueConstraints = {
        @UniqueConstraint(name = "uq_registration_student_campaign", columnNames = {"campaign_id", "student_code"})
})
@Getter
@Setter
@NoArgsConstructor
public class StudentRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    /** Normalized institutional identifier (CNE / Masar code). */
    @Column(name = "student_code", nullable = false, length = 64)
    private String studentCode;

    @Column(name = "email", length = 320)
    private String email;

    @Column(name = "full_name", length = 200)
    private String fullName;

    @Column(name = "filiere", length = 200)
    private String filiere;

    /** Authoritative FIFO sequence (monotonic per campaign). */
    @Column(name = "sequence_no", nullable = false)
    private long sequenceNo;

    /** Server-assigned arrival timestamp (UTC). */
    @Column(name = "arrival_at", nullable = false)
    private Instant arrivalAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QueueStatus status = QueueStatus.WAITING;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "station_id")
    private Station station;

    @Column(name = "recovery_account", nullable = false)
    private boolean recoveryAccount = false;

    @Column(name = "called_at")
    private Instant calledAt;

    @Column(name = "interview_started_at")
    private Instant interviewStartedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "withdrawn_at")
    private Instant withdrawnAt;

    @Column(name = "registered_at", nullable = false, updatable = false)
    private Instant registeredAt = Instant.now();

    @Version
    @Column(name = "version", nullable = false)
    private long version;
}
