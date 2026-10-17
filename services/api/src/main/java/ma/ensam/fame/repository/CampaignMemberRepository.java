package ma.ensam.fame.repository;

import ma.ensam.fame.domain.CampaignMember;
import ma.ensam.fame.domain.CampaignMember.CampaignMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface CampaignMemberRepository extends JpaRepository<CampaignMember, CampaignMemberId> {

    @Query("select m from CampaignMember m where m.id.userId = :userId")
    List<CampaignMember> findByUserId(@Param("userId") UUID userId);

    @Query("select m from CampaignMember m where m.id.campaignId = :campaignId")
    List<CampaignMember> findByCampaignId(@Param("campaignId") UUID campaignId);

    @Query("select count(m) > 0 from CampaignMember m where m.id.campaignId = :campaignId and m.id.userId = :userId")
    boolean existsByCampaignIdAndUserId(@Param("campaignId") UUID campaignId, @Param("userId") UUID userId);

    @Modifying
    @Query("delete from CampaignMember m where m.id.campaignId = :campaignId and m.id.userId = :userId")
    void deleteByCampaignIdAndUserId(@Param("campaignId") UUID campaignId, @Param("userId") UUID userId);
}
