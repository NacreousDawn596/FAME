package ma.ensam.fame.repository;

import ma.ensam.fame.domain.Station;
import ma.ensam.fame.domain.StationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface StationRepository extends JpaRepository<Station, UUID> {
    List<Station> findByCampaignIdOrderByLabel(UUID campaignId);
    List<Station> findByCampaignIdAndStatus(UUID campaignId, StationStatus status);
    void deleteByCampaignId(UUID campaignId);
}
