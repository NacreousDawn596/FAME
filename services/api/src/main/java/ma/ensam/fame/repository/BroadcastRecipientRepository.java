package ma.ensam.fame.repository;

import ma.ensam.fame.domain.BroadcastRecipient;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BroadcastRecipientRepository extends JpaRepository<BroadcastRecipient, UUID> {
    List<BroadcastRecipient> findByBroadcastIdOrderByStatusAsc(UUID broadcastId);
    List<BroadcastRecipient> findTop100ByStatusInOrderByIdAsc(List<BroadcastRecipient.Status> statuses);
    long countByBroadcastId(UUID broadcastId);
}
