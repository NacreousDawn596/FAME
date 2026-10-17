package ma.ensam.fame.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/**
 * Mutable business setting persisted in the database (distinct from
 * version-controlled deployment config in config.yml). Never holds secrets.
 */
@Entity
@Table(name = "app_setting")
@Getter
@Setter
@NoArgsConstructor
public class AppSetting {

    @Id
    @Column(length = 120)
    private String key;

    @Column(nullable = false, columnDefinition = "text")
    private String value;

    @Column(length = 500)
    private String description;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Column(name = "updated_by", length = 120)
    private String updatedBy;
}
