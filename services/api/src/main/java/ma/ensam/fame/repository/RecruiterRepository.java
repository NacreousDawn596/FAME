package ma.ensam.fame.repository;

import ma.ensam.fame.domain.Recruiter;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RecruiterRepository extends JpaRepository<Recruiter, UUID> {
    List<Recruiter> findByCompanyId(UUID companyId);
}
