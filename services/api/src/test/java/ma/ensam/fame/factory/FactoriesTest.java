package ma.ensam.fame.factory;

import ma.ensam.fame.domain.*;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

class FactoriesTest {

    private final CampaignFactory campaignFactory = new CampaignFactory();
    private final StationFactory stationFactory = new StationFactory();
    private final StudentRegistrationFactory registrationFactory = new StudentRegistrationFactory();

    @Test
    void campaignFactoryBuildsDraftCampaign() {
        Company company = new Company();
        company.setId(UUID.randomUUID());
        AppUser owner = new AppUser();
        owner.setId(UUID.randomUUID());

        Campaign campaign = campaignFactory.create(new CampaignFactory.Context(
                company, owner, "Forum PFE", "desc", "Salle BIB 4",
                Instant.now(), Instant.now().plusSeconds(3600)));

        assertEquals(CampaignStatus.DRAFT, campaign.getStatus());
        assertEquals("Forum PFE", campaign.getName());
        assertSame(company, campaign.getCompany());
        assertSame(owner, campaign.getOwner());
    }

    @Test
    void stationFactoryDefaultsToAvailableAndZeroPosition() {
        Campaign campaign = new Campaign();
        campaign.setId(UUID.randomUUID());

        Station station = stationFactory.create(new StationFactory.Context(
                campaign, "Table 1", "Salle A", "GI", null, null, null));

        assertEquals(StationStatus.AVAILABLE, station.getStatus());
        assertEquals(0.0, station.getPosX());
        assertEquals(0.0, station.getPosY());
        assertEquals("Table 1", station.getLabel());
    }

    @Test
    void registrationFactoryDefaultsToWaitingAndServerTimestamp() {
        Campaign campaign = new Campaign();
        campaign.setId(UUID.randomUUID());
        Instant arrival = Instant.now();

        StudentRegistration reg = registrationFactory.create(
                new StudentRegistrationFactory.Context(
                        campaign, "CNE1", "a@b.c", "Ali", "GI", true, 42L, arrival));

        assertEquals(QueueStatus.WAITING, reg.getStatus());
        assertEquals(42L, reg.getSequenceNo());
        assertEquals(arrival, reg.getArrivalAt());
        assertTrue(reg.isRecoveryAccount());
        assertEquals("CNE1", reg.getStudentCode());
    }
}
