package ma.ensam.fame.repository;

import ma.ensam.fame.domain.AppUser;
import ma.ensam.fame.domain.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUser, UUID> {
    Optional<AppUser> findByUsername(String username);
    boolean existsByUsername(String username);

    @Query("""
            select u from AppUser u
            where (:q is null or lower(u.username) like lower(concat('%', :q, '%'))
                   or lower(u.displayName) like lower(concat('%', :q, '%')))
              and (:role is null or u.role = :role)
            order by u.createdAt desc
            """)
    List<AppUser> search(@Param("q") String q, @Param("role") Role role);
}
