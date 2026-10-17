package ma.ensam.fame.repository;

import ma.ensam.fame.domain.AuthChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AuthChallengeRepository extends JpaRepository<AuthChallenge, UUID> {
    Optional<AuthChallenge> findByChallenge(String challenge);
}
