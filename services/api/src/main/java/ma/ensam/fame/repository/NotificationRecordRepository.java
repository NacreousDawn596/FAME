package ma.ensam.fame.repository;

import ma.ensam.fame.domain.NotificationRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationRecordRepository extends JpaRepository<NotificationRecord, UUID> {
    Optional<NotificationRecord> findByDedupKey(String dedupKey);
    List<NotificationRecord> findTop50ByStatusInOrderByCreatedAtAsc(List<String> statuses);
}
