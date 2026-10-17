package ma.ensam.fame.repository;

import ma.ensam.fame.domain.PushSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, UUID> {
    List<PushSubscription> findByRegistrationId(UUID registrationId);
    Optional<PushSubscription> findByRegistrationIdAndEndpoint(UUID registrationId, String endpoint);
    void deleteByRegistrationIdAndEndpoint(UUID registrationId, String endpoint);
}
