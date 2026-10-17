package ma.ensam.fame.repository;

import ma.ensam.fame.domain.Campaign;
import ma.ensam.fame.domain.CampaignStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CampaignRepository extends JpaRepository<Campaign, UUID> {
    List<Campaign> findByStatusInOrderByCreatedAtDesc(List<CampaignStatus> statuses);
}
