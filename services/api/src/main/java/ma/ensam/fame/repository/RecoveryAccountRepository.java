package ma.ensam.fame.repository;

import ma.ensam.fame.domain.RecoveryAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface RecoveryAccountRepository extends JpaRepository<RecoveryAccount, UUID> {
    Optional<RecoveryAccount> findByUsername(String username);
    Optional<RecoveryAccount> findByCampaignIdAndStudentCode(UUID campaignId, String studentCode);
}
