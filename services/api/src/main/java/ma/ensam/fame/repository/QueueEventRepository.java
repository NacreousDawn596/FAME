package ma.ensam.fame.repository;

import ma.ensam.fame.domain.QueueEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface QueueEventRepository extends JpaRepository<QueueEvent, UUID> {
    List<QueueEvent> findByCampaignIdOrderByOccurredAtDesc(UUID campaignId, Pageable pageable);
    List<QueueEvent> findByCampaignIdAndEntityIdOrderByOccurredAtAsc(UUID campaignId, String entityId);
}
