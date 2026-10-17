package ma.ensam.fame.repository;

import ma.ensam.fame.domain.QueueStatus;
import ma.ensam.fame.domain.StudentRegistration;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface StudentRegistrationRepository extends JpaRepository<StudentRegistration, UUID> {

    Optional<StudentRegistration> findByCampaignIdAndStudentCode(UUID campaignId, String studentCode);

    boolean existsByCampaignIdAndStudentCode(UUID campaignId, String studentCode);

    List<StudentRegistration> findByCampaignIdOrderBySequenceNoAsc(UUID campaignId);

    @Query("""
            select r from StudentRegistration r
            where r.campaign.id = :campaignId
              and r.status in :statuses
            order by r.sequenceNo asc
            """)
    List<StudentRegistration> findByCampaignAndStatusInOrderBySequence(
            @Param("campaignId") UUID campaignId,
            @Param("statuses") List<QueueStatus> statuses);

    @Query("""
            select r from StudentRegistration r
            where r.campaign.id = :campaignId
              and r.filiere = :filiere
              and r.status in :statuses
            order by r.sequenceNo asc
            """)
    List<StudentRegistration> findAvailableByFiliere(
            @Param("campaignId") UUID campaignId,
            @Param("filiere") String filiere,
            @Param("statuses") List<QueueStatus> statuses);

    /** Pessimistic-locked fetch for atomic claim operations. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from StudentRegistration r where r.id = :id")
    Optional<StudentRegistration> findByIdForUpdate(@Param("id") UUID id);

    long countByCampaignIdAndStatusIn(UUID campaignId, List<QueueStatus> statuses);

    long countByCampaignId(UUID campaignId);

    long countByStatusIn(List<QueueStatus> statuses);

    @Query("""
            select r from StudentRegistration r
            where (:q is null or lower(r.fullName) like lower(concat('%', :q, '%'))
                   or lower(r.studentCode) like lower(concat('%', :q, '%'))
                   or lower(r.email) like lower(concat('%', :q, '%')))
              and (:campaignId is null or r.campaign.id = :campaignId)
              and (:status is null or r.status = :status)
              and (:filiere is null or lower(r.filiere) = lower(:filiere))
            order by r.sequenceNo asc
            """)
    List<StudentRegistration> search(
            @Param("q") String q,
            @Param("campaignId") UUID campaignId,
            @Param("status") QueueStatus status,
            @Param("filiere") String filiere,
            org.springframework.data.domain.Pageable pageable);

    /** Atomic FIFO claim: locks the earliest eligible matching row, skipping already-locked rows. */
    @Query(value = """
            select * from student_registration
            where campaign_id = :campaignId
              and filiere = :filiere
              and status in ('WAITING','APPROACHING')
            order by sequence_no asc
            for update skip locked
            limit 1
            """, nativeQuery = true)
    Optional<StudentRegistration> claimNextForFiliere(
            @Param("campaignId") UUID campaignId,
            @Param("filiere") String filiere);
}
