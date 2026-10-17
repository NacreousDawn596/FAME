package ma.ensam.fame.service;

import ma.ensam.fame.domain.*;
import ma.ensam.fame.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class QueueEngineIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("fame")
            .withUsername("fame")
            .withPassword("fame");

    @Container
    static final GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine")
            .withExposedPorts(6379);

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
        registry.add("fame.worker.public-key", () -> testPublicKey);
        registry.add("fame.worker.issuer", () -> "https://test.workers.dev");
        registry.add("fame.worker.audience", () -> "fame-api");
        registry.add("fame.bootstrap.admin-password", () -> "admin-test-password");
    }

    private static final String testPublicKey =
            "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

    @Autowired
    private QueueEngine queueEngine;
    @Autowired
    private CampaignRepository campaignRepository;
    @Autowired
    private CompanyRepository companyRepository;
    @Autowired
    private AppUserRepository userRepository;
    @Autowired
    private StationRepository stationRepository;
    @Autowired
    private StudentRegistrationRepository registrationRepository;

    private Campaign campaign;

    @BeforeEach
    void setUp() {
        Company company = new Company();
        company.setName("Acme " + UUID.randomUUID());
        company = companyRepository.save(company);

        AppUser owner = new AppUser();
        owner.setUsername("owner-" + UUID.randomUUID());
        owner.setPasswordHash("x");
        owner.setDisplayName("Owner");
        owner.setRole(Role.ADMIN);
        owner = userRepository.save(owner);

        campaign = new Campaign();
        campaign.setName("Campaign " + UUID.randomUUID());
        campaign.setCompany(company);
        campaign.setOwner(owner);
        campaign.setStatus(CampaignStatus.ACTIVE);
        campaign.setStartsAt(Instant.now().minusSeconds(3600));
        campaign.setEndsAt(Instant.now().plusSeconds(3600));
        campaign = campaignRepository.save(campaign);
    }

    @Test
    void preservesFifoTieBreakOrdering() {
        for (int i = 0; i < 5; i++) {
            queueEngine.register(campaign, "CODE" + i, "s" + i + "@ensam-umi.ac.ma",
                    "Student " + i, "Génie Informatique", false);
        }
        List<StudentRegistration> next = queueEngine.nextCandidates(campaign, "Génie Informatique");
        assertEquals(5, next.size());
        for (int i = 0; i < next.size() - 1; i++) {
            assertTrue(next.get(i).getSequenceNo() < next.get(i + 1).getSequenceNo(),
                    "FIFO ordering must be monotonic by sequence number");
        }
    }

    @Test
    void duplicateRegistrationIsIdempotent() {
        StudentRegistration first = queueEngine.register(campaign, "CODE42", "a@ensam-umi.ac.ma",
                "Student", "Génie Informatique", false);
        StudentRegistration second = queueEngine.register(campaign, "CODE42", "a@ensam-umi.ac.ma",
                "Student", "Génie Informatique", false);
        assertEquals(first.getId(), second.getId());
        assertEquals(1, registrationRepository.countByCampaignId(campaign.getId()));
    }

    @Test
    void concurrentClaimsNeverDoubleAssign() throws Exception {
        queueEngine.register(campaign, "ONLY", "only@ensam-umi.ac.ma", "Only Student",
                "Génie Informatique", false);

        Station station = new Station();
        station.setCampaign(campaign);
        station.setLabel("Table 1");
        station.setFiliere("Génie Informatique");
        station.setStatus(StationStatus.AVAILABLE);
        station = stationRepository.save(station);
        final UUID stationId = station.getId();

        int threads = 4;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Optional<StudentRegistration>>> futures = new CopyOnWriteArrayList<>();

        for (int i = 0; i < threads; i++) {
            futures.add(pool.submit(() -> {
                ready.countDown();
                start.await();
                return queueEngine.call(campaign, stationId);
            }));
        }

        ready.await();
        start.countDown();
        pool.shutdown();
        pool.awaitTermination(20, TimeUnit.SECONDS);

        long successes = futures.stream().map(f -> {
            try { return f.get(); } catch (Exception e) { throw new RuntimeException(e); }
        }).filter(Optional::isPresent).count();

        assertEquals(1, successes, "Exactly one concurrent caller may claim the candidate");
    }

    @Test
    void candidateIsLockedAfterCall() {
        queueEngine.register(campaign, "LOCKED", "l@ensam-umi.ac.ma", "Locked Student",
                "Génie Informatique", false);
        Station station = station("Table 1", "Génie Informatique");

        Optional<StudentRegistration> called = queueEngine.call(campaign, station.getId());
        assertTrue(called.isPresent());
        assertEquals(QueueStatus.CALLED, called.get().getStatus());

        // Candidate is no longer available for another station.
        List<StudentRegistration> available = queueEngine.nextCandidates(campaign, "Génie Informatique");
        assertTrue(available.isEmpty(), "Called candidate must be locked from further selection");
    }

    @Test
    void crossCampaignAccessIsRejected() {
        // Second campaign with its own student.
        Company c2 = new Company();
        c2.setName("Other " + UUID.randomUUID());
        c2 = companyRepository.save(c2);
        AppUser owner2 = new AppUser();
        owner2.setUsername("owner2-" + UUID.randomUUID());
        owner2.setPasswordHash("x");
        owner2.setDisplayName("Owner2");
        owner2.setRole(Role.ADMIN);
        owner2 = userRepository.save(owner2);
        Campaign other = new Campaign();
        other.setName("Other " + UUID.randomUUID());
        other.setCompany(c2);
        other.setOwner(owner2);
        other.setStatus(CampaignStatus.ACTIVE);
        other = campaignRepository.save(other);

        StudentRegistration otherReg = queueEngine.register(other, "XCODE", "x@ensam-umi.ac.ma",
                "Other Student", "Génie Informatique", false);

        // Attempting to complete the other campaign's registration via this campaign is rejected.
        assertThrows(ma.ensam.fame.common.ApiException.class,
                () -> queueEngine.completeInterview(campaign, otherReg.getId()));
    }

    @Test
    void invalidTransitionsAreRejected() {
        StudentRegistration reg = queueEngine.register(campaign, "TRANS", "t@ensam-umi.ac.ma",
                "Trans Student", "Génie Informatique", false);
        // WAITING -> COMPLETED is invalid.
        assertThrows(ma.ensam.fame.common.ApiException.class,
                () -> queueEngine.completeInterview(campaign, reg.getId()));
    }

    private Station station(String label, String filiere) {
        Station s = new Station();
        s.setCampaign(campaign);
        s.setLabel(label);
        s.setFiliere(filiere);
        s.setStatus(StationStatus.AVAILABLE);
        return stationRepository.save(s);
    }
}
