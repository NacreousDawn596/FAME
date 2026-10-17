package ma.ensam.fame.factory;

import ma.ensam.fame.domain.AppUser;
import ma.ensam.fame.domain.Campaign;
import ma.ensam.fame.domain.CampaignStatus;
import ma.ensam.fame.domain.Company;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Builds {@link Campaign} instances. Centralizes the default state
 * (DRAFT) and field mapping so services only orchestrate persistence.
 */
@Component
public class CampaignFactory implements Factory<Campaign, CampaignFactory.Context> {

    public record Context(
            Company company,
            AppUser owner,
            String name,
            String description,
            String location,
            Instant startsAt,
            Instant endsAt) {
    }

    @Override
    public Campaign create(Context ctx) {
        Campaign campaign = new Campaign();
        campaign.setName(ctx.name());
        campaign.setCompany(ctx.company());
        campaign.setOwner(ctx.owner());
        campaign.setDescription(ctx.description());
        campaign.setLocation(ctx.location());
        campaign.setStartsAt(ctx.startsAt());
        campaign.setEndsAt(ctx.endsAt());
        campaign.setStatus(CampaignStatus.DRAFT);
        return campaign;
    }
}
