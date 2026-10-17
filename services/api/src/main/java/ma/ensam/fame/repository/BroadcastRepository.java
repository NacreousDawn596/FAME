package ma.ensam.fame.repository;

import ma.ensam.fame.domain.Broadcast;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface BroadcastRepository extends JpaRepository<Broadcast, UUID> {
    List<Broadcast> findByOrderByCreatedAtDesc(Pageable pageable);
}
