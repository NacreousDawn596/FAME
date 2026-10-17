package ma.ensam.fame.service;

import ma.ensam.fame.domain.*;
import ma.ensam.fame.repository.StationRepository;
import ma.ensam.fame.repository.StudentRegistrationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AnalyticsServiceTest {

    private StudentRegistrationRepository registrationRepository;
    private StationRepository stationRepository;
    private CampaignAccessService accessService;
    private AnalyticsService analyticsService;

    @BeforeEach
    void setUp() {
        registrationRepository = mock(StudentRegistrationRepository.class);
        stationRepository = mock(StationRepository.class);
        accessService = mock(CampaignAccessService.class);
        analyticsService = new AnalyticsService(registrationRepository, stationRepository, accessService);
    }

    @Test
    void computesWaitingTimeMeanAndMedian() {
        Campaign campaign = campaign();
        UUID campaignId = campaign.getId();

        when(accessService.requireCampaignAccess(eq(campaignId), any())).thenReturn(campaign);
        when(stationRepository.findByCampaignIdOrderByLabel(campaignId)).thenReturn(List.of());

        List<StudentRegistration> regs = List.of(
                reg(campaign, 1, QueueStatus.COMPLETED, 0, 10),
                reg(campaign, 2, QueueStatus.COMPLETED, 0, 20),
                reg(campaign, 3, QueueStatus.COMPLETED, 0, 30),
                reg(campaign, 4, QueueStatus.WITHDRAWN, 0, 0)
        );
        when(registrationRepository.findByCampaignIdOrderBySequenceNoAsc(campaignId)).thenReturn(regs);

        AnalyticsService.AnalyticsResult result = analyticsService.analyze(campaignId, null);

        assertEquals(4, result.totalRegistered());
        assertEquals(3, result.completed());
        assertEquals(1, result.withdrawn());
        assertEquals(20.0, result.meanWaitingSeconds(), 0.001);
        assertEquals(20.0, result.medianWaitingSeconds(), 0.001);
    }

    @Test
    void computesNoShowRateExcludingWithdrawn() {
        Campaign campaign = campaign();
        UUID campaignId = campaign.getId();

        when(accessService.requireCampaignAccess(eq(campaignId), any())).thenReturn(campaign);
        when(stationRepository.findByCampaignIdOrderByLabel(campaignId)).thenReturn(List.of());

        List<StudentRegistration> regs = List.of(
                reg(campaign, 1, QueueStatus.COMPLETED, 0, 10),
                reg(campaign, 2, QueueStatus.ABSENT, 0, 10),
                reg(campaign, 3, QueueStatus.ABSENT, 0, 10),
                reg(campaign, 4, QueueStatus.WITHDRAWN, 0, 10)
        );
        when(registrationRepository.findByCampaignIdOrderBySequenceNoAsc(campaignId)).thenReturn(regs);

        AnalyticsService.AnalyticsResult result = analyticsService.analyze(campaignId, null);

        // absent / (absent + completed) = 2 / 3
        assertEquals(2.0 / 3.0, result.noShowRate(), 0.001);
    }

    private Campaign campaign() {
        Campaign c = new Campaign();
        c.setId(UUID.randomUUID());
        c.setName("Test");
        c.setStatus(CampaignStatus.ACTIVE);
        Company company = new Company();
        company.setId(UUID.randomUUID());
        company.setName("Acme");
        c.setCompany(company);
        return c;
    }

    private StudentRegistration reg(Campaign campaign, long seq, QueueStatus status,
                                    long arrivalOffset, long calledOffset) {
        StudentRegistration r = new StudentRegistration();
        r.setId(UUID.randomUUID());
        r.setCampaign(campaign);
        r.setSequenceNo(seq);
        r.setStatus(status);
        Instant base = Instant.parse("2026-01-01T08:00:00Z");
        r.setArrivalAt(base.plusSeconds(arrivalOffset));
        if (calledOffset > 0) {
            r.setCalledAt(base.plusSeconds(calledOffset));
        }
        if (status == QueueStatus.COMPLETED) {
            r.setInterviewStartedAt(base.plusSeconds(calledOffset + 5));
            r.setCompletedAt(base.plusSeconds(calledOffset + 15));
        }
        r.setFiliere("Génie Informatique");
        return r;
    }
}
