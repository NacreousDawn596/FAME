package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.*;
import ma.ensam.fame.repository.AuthChallengeRepository;
import ma.ensam.fame.repository.RecoveryAccountRepository;
import ma.ensam.fame.repository.RosterEntryRepository;
import ma.ensam.fame.repository.StudentRegistrationRepository;
import ma.ensam.fame.security.SchoolAppAssertionVerifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;

/**
 * Student authentication: SchoolApp assertion verification, final-year
 * (niveau 5A) and eligibility checks, and organizer-assisted emergency recovery.
 */
@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    /** Expected academic level for eligible students (final year). */
    public static final String FINAL_YEAR_NIVEAU = "5A";

    private final SchoolAppAssertionVerifier verifier;
    private final AuthChallengeRepository challengeRepository;
    private final RosterEntryRepository rosterRepository;
    private final StudentRegistrationRepository registrationRepository;
    private final RecoveryAccountRepository recoveryRepository;
    private final CampaignAccessService accessService;
    private final QueueEngine queueEngine;
    private final RateLimiter rateLimiter;
    private final PasswordEncoder passwordEncoder;

    public AuthService(SchoolAppAssertionVerifier verifier,
                       AuthChallengeRepository challengeRepository,
                       RosterEntryRepository rosterRepository,
                       StudentRegistrationRepository registrationRepository,
                       RecoveryAccountRepository recoveryRepository,
                       CampaignAccessService accessService,
                       QueueEngine queueEngine,
                       RateLimiter rateLimiter,
                       PasswordEncoder passwordEncoder) {
        this.verifier = verifier;
        this.challengeRepository = challengeRepository;
        this.rosterRepository = rosterRepository;
        this.registrationRepository = registrationRepository;
        this.recoveryRepository = recoveryRepository;
        this.accessService = accessService;
        this.queueEngine = queueEngine;
        this.rateLimiter = rateLimiter;
        this.passwordEncoder = passwordEncoder;
    }

    /* ------------------------------------------------------------------ */
    /* Challenge                                                           */
    /* ------------------------------------------------------------------ */

    @Transactional
    public ChallengeResponse createChallenge() {
        String challenge = randomToken();
        String nonce = randomToken();
        AuthChallenge entity = new AuthChallenge();
        entity.setChallenge(challenge);
        entity.setNonce(nonce);
        entity.setCreatedAt(Instant.now());
        entity.setExpiresAt(Instant.now().plus(Duration.ofSeconds(120)));
        challengeRepository.save(entity);
        return new ChallengeResponse(challenge, nonce, 120);
    }

    /* ------------------------------------------------------------------ */
    /* SchoolApp assertion + registration                                  */
    /* ------------------------------------------------------------------ */

    @Transactional
    public AssertionResult authenticateStudent(String rawAssertion, java.util.UUID campaignId) {
        rateLimiter.check("auth:assert:" + clientKey(), 30, Duration.ofMinutes(1));

        SchoolAppAssertionVerifier.Assertion assertion = verifier.verify(rawAssertion);

        Campaign campaign = accessService.requireCampaign(campaignId);
        if (campaign.getStatus() != CampaignStatus.ACTIVE) {
            throw ApiException.forbidden("CAMPAIGN_NOT_ACTIVE", "Campaign is not accepting registrations");
        }
        if (campaign.getEndsAt() != null && Instant.now().isAfter(campaign.getEndsAt())) {
            throw ApiException.forbidden("CAMPAIGN_EXPIRED", "Campaign has ended");
        }

        // Any email domain is accepted (Google, Proton, edu, etc.) as long as
        // SchoolApp login succeeds. Eligibility is driven by the final-year
        // niveau and the imported whitelist, not the email domain.
        if (!isFinalYear(assertion.niveau())) {
            log.warn("Rejected non-final-year student {} (niveau {})", assertion.studentCode(), assertion.niveau());
            throw ApiException.forbidden("NOT_FINAL_YEAR",
                    "Seuls les étudiants en 5A (dernière année) sont éligibles");
        }

        RosterEntry roster = rosterRepository
                .findByCampaignIdAndStudentCode(campaignId, assertion.studentCode())
                .orElseThrow(() -> ApiException.forbidden("NOT_ELIGIBLE", "Student is not eligible for this campaign"));

        StudentRegistration reg = registrationRepository
                .findByCampaignIdAndStudentCode(campaignId, assertion.studentCode())
                .orElse(null);

        if (reg == null) {
            // Filière from the signed SchoolApp profile (administrative_info.Filière),
            // falling back to the imported roster entry if the profile lacks it.
            String filiere = (assertion.filiere() != null && !assertion.filiere().isBlank())
                    ? assertion.filiere() : roster.getFiliere();
            reg = queueEngine.register(campaign, assertion.studentCode(),
                    assertion.email(), assertion.fullName(), filiere, false);
        }

        return new AssertionResult(reg.getId(), campaignId, reg.getStudentCode(),
                reg.getFullName(), reg.getEmail(), reg.isRecoveryAccount(), false);
    }

    /** Normalizes and checks that the SchoolApp "Niveau" is the final year (5A). */
    static boolean isFinalYear(String niveau) {
        if (niveau == null) return false;
        return FINAL_YEAR_NIVEAU.equals(niveau.trim().toUpperCase().replaceAll("\\s+", ""));
    }

    /* ------------------------------------------------------------------ */
    /* Emergency recovery                                                  */
    /* ------------------------------------------------------------------ */

    @Transactional
    public RecoveryIssued createRecovery(java.util.UUID campaignId, String studentCode) {
        Campaign campaign = accessService.requireCampaign(campaignId);
        RosterEntry roster = rosterRepository
                .findByCampaignIdAndStudentCode(campaignId, SchoolAppAssertionVerifier.normalizeCode(studentCode))
                .orElseThrow(() -> ApiException.notFound("ROSTER_NOT_FOUND", "Student not found in eligible roster"));

        String username = "secours-" + randomToken().substring(0, 8);
        String tempPassword = randomToken().substring(0, 16);
        String code = SchoolAppAssertionVerifier.normalizeCode(studentCode);

        RecoveryAccount account = recoveryRepository
                .findByCampaignIdAndStudentCode(campaignId, code)
                .orElseGet(RecoveryAccount::new);
        account.setCampaignId(campaignId);
        account.setStudentCode(code);
        account.setEmail(roster.getEmail());
        account.setFullName(roster.getFullName());
        account.setFiliere(roster.getFiliere());
        account.setUsername(username);
        account.setPasswordHash(passwordEncoder.encode(tempPassword));
        account.setMustChangePassword(true);
        account.setExpiresAt(Instant.now().plus(Duration.ofMinutes(30)));
        account.setUsedAt(null);
        recoveryRepository.save(account);

        return new RecoveryIssued(username, tempPassword);
    }

    @Transactional
    public RecoveryLoginResult recoveryLogin(String username, String password) {
        rateLimiter.check("auth:recovery:" + clientKey(), 10, Duration.ofMinutes(1));

        RecoveryAccount account = recoveryRepository.findByUsername(username)
                .orElseThrow(() -> ApiException.unauthorized("RECOVERY_INVALID", "Invalid recovery credentials"));

        if (account.getUsedAt() != null || Instant.now().isAfter(account.getExpiresAt())) {
            throw ApiException.unauthorized("RECOVERY_EXPIRED", "Recovery credential expired");
        }
        if (!passwordEncoder.matches(password == null ? "" : password, account.getPasswordHash())) {
            throw ApiException.unauthorized("RECOVERY_INVALID", "Invalid recovery credentials");
        }

        Campaign campaign = accessService.requireCampaign(account.getCampaignId());
        StudentRegistration reg = registrationRepository
                .findByCampaignIdAndStudentCode(campaign.getId(), account.getStudentCode())
                .orElse(null);
        if (reg == null) {
            reg = queueEngine.register(campaign, account.getStudentCode(), account.getEmail(),
                    account.getFullName(), account.getFiliere(), true);
        }
        return new RecoveryLoginResult(reg, account.isMustChangePassword());
    }

    @Transactional
    public void changeRecoveryPassword(java.util.UUID campaignId, String studentCode, String newPassword) {
        String code = SchoolAppAssertionVerifier.normalizeCode(studentCode);
        RecoveryAccount account = recoveryRepository
                .findByCampaignIdAndStudentCode(campaignId, code)
                .orElseThrow(() -> ApiException.notFound("RECOVERY_NOT_FOUND", "Recovery account not found"));

        if (!account.isMustChangePassword() || account.getUsedAt() != null) {
            throw ApiException.conflict("RECOVERY_USED", "Recovery credential already used");
        }
        if (newPassword == null || newPassword.length() < 10) {
            throw ApiException.badRequest("WEAK_PASSWORD", "Password must be at least 10 characters");
        }
        account.setPasswordHash(passwordEncoder.encode(newPassword));
        account.setMustChangePassword(false);
        account.setUsedAt(Instant.now());
        recoveryRepository.save(account);
    }

    /* ------------------------------------------------------------------ */

    private static String randomToken() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String clientKey() {
        return "anonymous";
    }

    public record ChallengeResponse(String challenge, String nonce, long expiresInSeconds) {
    }

    public record AssertionResult(java.util.UUID registrationId, java.util.UUID campaignId,
                                  String studentCode, String fullName, String email,
                                  boolean recovery, boolean mustChangePassword) {
    }

    public record RecoveryIssued(String username, String password) {
    }

    public record RecoveryLoginResult(StudentRegistration registration, boolean mustChangePassword) {
    }
}
