package ma.ensam.fame.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "station")
@Getter
@Setter
@NoArgsConstructor
public class Station {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "campaign_id", nullable = false)
    private Campaign campaign;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "recruiter_id")
    private Recruiter recruiter;

    @Column(nullable = false, length = 120)
    private String label;

    @Column(name = "location_label", length = 120)
    private String locationLabel;

    /** Requested academic program (filière) — may change frequently. */
    @Column(name = "filiere", length = 200)
    private String filiere;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StationStatus status = StationStatus.AVAILABLE;

    @Column(name = "pos_x", nullable = false)
    private double posX;

    @Column(name = "pos_y", nullable = false)
    private double posY;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Version
    @Column(name = "version", nullable = false)
    private long version;
}
