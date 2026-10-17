package ma.ensam.fame.repository;

import ma.ensam.fame.domain.RosterEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RosterEntryRepository extends JpaRepository<RosterEntry, UUID> {
    Optional<RosterEntry> findByCampaignIdAndStudentCode(UUID campaignId, String studentCode);
    List<RosterEntry> findByCampaignId(UUID campaignId);
    long countByCampaignId(UUID campaignId);
    void deleteByCampaignId(UUID campaignId);
}
