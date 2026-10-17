package ma.ensam.fame.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "campaign_member", uniqueConstraints = {
        @UniqueConstraint(name = "uq_campaign_member", columnNames = {"campaign_id", "user_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class CampaignMember {

    @EmbeddedId
    private CampaignMemberId id;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public CampaignMember(UUID campaignId, UUID userId) {
        this.id = new CampaignMemberId(campaignId, userId);
    }

    @Embeddable
    @Getter
    @Setter
    @NoArgsConstructor
    public static class CampaignMemberId implements Serializable {
        @Column(name = "campaign_id")
        private UUID campaignId;

        @Column(name = "user_id")
        private UUID userId;

        public CampaignMemberId(UUID campaignId, UUID userId) {
            this.campaignId = campaignId;
            this.userId = userId;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof CampaignMemberId that)) return false;
            return Objects.equals(campaignId, that.campaignId) && Objects.equals(userId, that.userId);
        }

        @Override
        public int hashCode() {
            return Objects.hash(campaignId, userId);
        }
    }
}
