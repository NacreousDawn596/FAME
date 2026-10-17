package ma.ensam.fame.factory;

import ma.ensam.fame.domain.Campaign;
import ma.ensam.fame.domain.Recruiter;
import ma.ensam.fame.domain.Station;
import ma.ensam.fame.domain.StationStatus;
import org.springframework.stereotype.Component;

/**
 * Builds {@link Station} instances. Centralizes default status (AVAILABLE)
 * and position normalization so services only orchestrate persistence.
 */
@Component
public class StationFactory implements Factory<Station, StationFactory.Context> {

    public record Context(
            Campaign campaign,
            String label,
            String locationLabel,
            String filiere,
            Recruiter recruiter,
            Double posX,
            Double posY) {
    }

    @Override
    public Station create(Context ctx) {
        Station station = new Station();
        station.setCampaign(ctx.campaign());
        station.setLabel(ctx.label());
        station.setLocationLabel(ctx.locationLabel());
        station.setFiliere(ctx.filiere());
        station.setRecruiter(ctx.recruiter());
        station.setPosX(ctx.posX() == null ? 0 : ctx.posX());
        station.setPosY(ctx.posY() == null ? 0 : ctx.posY());
        station.setStatus(StationStatus.AVAILABLE);
        return station;
    }
}
