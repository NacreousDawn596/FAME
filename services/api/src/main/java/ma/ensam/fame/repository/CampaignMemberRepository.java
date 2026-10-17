package ma.ensam.fame.repository;

import ma.ensam.fame.domain.CampaignMember;
import ma.ensam.fame.domain.CampaignMember.CampaignMemberId;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CampaignMemberRepository extends JpaRepository<CampaignMember, CampaignMemberId> {
    List<CampaignMember> findByUserId(UUID userId);
    List<CampaignMember> findByCampaignId(UUID campaignId);
    boolean existsByCampaignIdAndUserId(UUID campaignId, UUID userId);
    void deleteByCampaignIdAndUserId(UUID campaignId, UUID userId);
}
