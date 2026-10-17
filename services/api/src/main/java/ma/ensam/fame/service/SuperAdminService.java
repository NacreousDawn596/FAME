package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.config.SuperAdminProperties;
import ma.ensam.fame.domain.AppUser;
import ma.ensam.fame.domain.Role;
import ma.ensam.fame.repository.AppUserRepository;
import ma.ensam.fame.security.FameUserPrincipal;
import ma.ensam.fame.security.SchoolAppAssertionVerifier;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

/**
 * Resolves the designated superadmin identity. The superadmin is granted only
 * after the backend verifies a SchoolApp identity assertion AND the verified
 * institutional email matches the configured {@code fame.admin.email}.
 */
@Service
public class SuperAdminService {

    private static final Logger log = LoggerFactory.getLogger(SuperAdminService.class);

    private final SuperAdminProperties properties;
    private final SchoolAppAssertionVerifier verifier;
    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RateLimiter rateLimiter;

    public SuperAdminService(SuperAdminProperties properties,
                             SchoolAppAssertionVerifier verifier,
                             AppUserRepository userRepository,
                             PasswordEncoder passwordEncoder,
                             RateLimiter rateLimiter) {
        this.properties = properties;
        this.verifier = verifier;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.rateLimiter = rateLimiter;
    }

    /**
     * Normalization policy: trim and lower-case, consistent with the configured
     * administrator email.
     */
    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    public boolean isConfigured() {
        return properties.email() != null && !properties.email().isBlank();
    }

    @Transactional
    public FameUserPrincipal authenticate(String rawAssertion) {
        rateLimiter.check("auth:admin:" + "login", 10, Duration.ofMinutes(1));

        if (!isConfigured()) {
            log.warn("Superadmin email not configured; denying admin login");
            throw ApiException.forbidden("ADMIN_NOT_CONFIGURED", "Superadmin identity is not configured");
        }

        SchoolAppAssertionVerifier.Assertion assertion = verifier.verify(rawAssertion);

        String configured = normalizeEmail(properties.email());
        String provided = normalizeEmail(assertion.email());
        if (provided == null || !configured.equals(provided)) {
            log.warn("Superadmin login rejected for non-matching email");
            throw ApiException.forbidden("NOT_SUPERADMIN", "Identity is not the designated administrator");
        }

        // Find-or-create the backing staff account (no usable local password).
        AppUser user = userRepository.findByUsername(configured)
                .orElseGet(() -> {
                    AppUser u = new AppUser();
                    u.setUsername(configured);
                    u.setPasswordHash(passwordEncoder.encode(randomUnusablePassword()));
                    u.setDisplayName(assertion.fullName() == null ? "Administrateur" : assertion.fullName());
                    u.setRole(Role.SUPERADMIN);
                    u.setEnabled(true);
                    return userRepository.save(u);
                });

        if (user.getRole() != Role.SUPERADMIN) {
            user.setRole(Role.SUPERADMIN);
            userRepository.save(user);
        }

        return new FameUserPrincipal(user.getId(), user.getUsername(), user.getDisplayName(), Role.SUPERADMIN);
    }

    private static String randomUnusablePassword() {
        // Random 32-byte value so the local password login can never match.
        byte[] bytes = new byte[32];
        new java.security.SecureRandom().nextBytes(bytes);
        return java.util.Base64.getEncoder().encodeToString(bytes);
    }
}
