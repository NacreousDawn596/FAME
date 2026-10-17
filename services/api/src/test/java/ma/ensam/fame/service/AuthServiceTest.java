package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.Campaign;
import ma.ensam.fame.domain.CampaignStatus;
import ma.ensam.fame.domain.Role;
import ma.ensam.fame.repository.*;
import ma.ensam.fame.security.SchoolAppAssertionVerifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceTest {

    private SchoolAppAssertionVerifier verifier;
    private CampaignAccessService accessService;
    private RosterEntryRepository rosterRepository;
    private StudentRegistrationRepository registrationRepository;
    private QueueEngine queueEngine;
    private RateLimiter rateLimiter;
    private AuthService service;

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

    @BeforeEach
    void setUp() {
        verifier = mock(SchoolAppAssertionVerifier.class);
        accessService = mock(CampaignAccessService.class);
        rosterRepository = mock(RosterEntryRepository.class);
        registrationRepository = mock(StudentRegistrationRepository.class);
        queueEngine = mock(QueueEngine.class);
        rateLimiter = mock(RateLimiter.class);
        service = new AuthService(verifier, mock(AuthChallengeRepository.class),
                rosterRepository, registrationRepository, mock(RecoveryAccountRepository.class),
                accessService, queueEngine, rateLimiter, passwordEncoder);
    }

    @Test
    void isFinalYearNormalizesNiveau() {
        assertTrue(AuthService.isFinalYear("5A"));
        assertTrue(AuthService.isFinalYear(" 5A "));
        assertTrue(AuthService.isFinalYear("5a"));
        assertTrue(AuthService.isFinalYear("5 A"));
        assertFalse(AuthService.isFinalYear("2A"));
        assertFalse(AuthService.isFinalYear("4A"));
        assertFalse(AuthService.isFinalYear(null));
        assertFalse(AuthService.isFinalYear(""));
    }

    @Test
    void rejectsNonFinalYearStudent() {
        Campaign campaign = new Campaign();
        campaign.setId(UUID.randomUUID());
        campaign.setStatus(CampaignStatus.ACTIVE);

        when(verifier.verify(any())).thenReturn(new SchoolAppAssertionVerifier.Assertion(
                "CNE1", "student@proton.me", "Ali", "GI", "2A", "ch", "nonce"));
        when(accessService.requireCampaign(any())).thenReturn(campaign);

        ApiException ex = assertThrows(ApiException.class,
                () -> service.authenticateStudent("assertion", campaign.getId()));
        assertEquals("NOT_FINAL_YEAR", ex.getCode());
        verify(rosterRepository, never()).findByCampaignIdAndStudentCode(any(), any());
    }

    @Test
    void acceptsFinalYearStudent() {
        Campaign campaign = new Campaign();
        campaign.setId(UUID.randomUUID());
        campaign.setStatus(CampaignStatus.ACTIVE);

        when(verifier.verify(any())).thenReturn(new SchoolAppAssertionVerifier.Assertion(
                "CNE1", "student@google.com", "Ali", "GI", "5A", "ch", "nonce"));
        when(accessService.requireCampaign(any())).thenReturn(campaign);
        when(rosterRepository.findByCampaignIdAndStudentCode(any(), any()))
                .thenReturn(java.util.Optional.empty());

        assertThrows(ApiException.class, () -> service.authenticateStudent("assertion", campaign.getId()));
        // Progresses past the niveau check to the roster/eligibility check.
        verify(rosterRepository).findByCampaignIdAndStudentCode(any(), any());
    }
}
