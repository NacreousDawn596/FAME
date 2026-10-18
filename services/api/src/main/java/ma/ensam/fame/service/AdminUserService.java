package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.config.DataInitializer;
import ma.ensam.fame.domain.*;
import ma.ensam.fame.repository.AppUserRepository;
import ma.ensam.fame.repository.RecoveryAccountRepository;
import ma.ensam.fame.repository.StudentRegistrationRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Administrative user management: staff accounts (disable/enable, role),
 * recruiter accounts, student search, session revocation and emergency-account
 * inspection. Never exposes password hashes or credentials.
 */
@Service
public class AdminUserService {

    private final AppUserRepository userRepository;
    private final StudentRegistrationRepository registrationRepository;
    private final RecoveryAccountRepository recoveryRepository;
    private final SessionAdminService sessionAdminService;
    private final AuditService audit;
    private final PasswordEncoder passwordEncoder;

    public AdminUserService(AppUserRepository userRepository,
                            StudentRegistrationRepository registrationRepository,
                            RecoveryAccountRepository recoveryRepository,
                            SessionAdminService sessionAdminService,
                            AuditService audit,
                            PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.registrationRepository = registrationRepository;
        this.recoveryRepository = recoveryRepository;
        this.sessionAdminService = sessionAdminService;
        this.audit = audit;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public List<AppUser> staff(String q, Role role) {
        return userRepository.search(q, role);
    }

    @Transactional
    public AppUser setEnabled(UUID userId, boolean enabled, String actor) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found"));
        if (user.getRole() == Role.SUPERADMIN) {
            throw ApiException.forbidden("SUPERADMIN_PROTECTED", "Cannot disable the superadmin account");
        }
        user.setEnabled(enabled);
        user = userRepository.save(user);
        audit.record(null, "USER", userId.toString(), enabled ? "USER_ENABLED" : "USER_DISABLED",
                Map.of("by", actor));
        if (!enabled) {
            sessionAdminService.revokeSessions(user.getUsername());
        }
        return user;
    }

    @Transactional
    public AppUser setRole(UUID userId, Role role, String actor) {
        AppUser user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.notFound("USER_NOT_FOUND", "User not found"));
        if (user.getRole() == Role.SUPERADMIN && role != Role.SUPERADMIN) {
            throw ApiException.forbidden("SUPERADMIN_PROTECTED", "Cannot demote the superadmin account");
        }
        user.setRole(role);
        user = userRepository.save(user);
        audit.record(null, "USER", userId.toString(), "ROLE_CHANGED",
                Map.of("role", role.name(), "by", actor));
        return user;
    }

    @Transactional(readOnly = true)
    public List<StudentRegistration> students(String q, UUID campaignId, QueueStatus status,
                                              String filiere, int page, int size) {
        return registrationRepository.search(q, campaignId, status, filiere, PageRequest.of(page, size));
    }

    @Transactional
    public int revokeUserSessions(String principalName, String actor) {
        int count = sessionAdminService.revokeSessions(principalName);
        audit.record(null, "SESSION", principalName, "SESSIONS_REVOKED",
                Map.of("count", count, "by", actor));
        return count;
    }

    @Transactional(readOnly = true)
    public List<RecoveryAccount> recoveryAccounts(UUID campaignId) {
        return recoveryRepository.findAll();
    }

    /* ------------------------- Recruiter accounts ----------------------- */

    @Transactional
    public AppUser createRecruiter(String email, String password, String displayName, String actor) {
        String normalized = DataInitializer.normalizeEmail(email);
        if (normalized == null || !normalized.contains("@")) {
            throw ApiException.badRequest("INVALID_EMAIL", "A valid email is required");
        }
        if (password == null || password.length() < 8) {
            throw ApiException.badRequest("WEAK_PASSWORD", "Password must be at least 8 characters");
        }
        if (userRepository.existsByUsername(normalized)) {
            throw ApiException.conflict("USER_EXISTS", "An account with this email already exists");
        }
        AppUser user = new AppUser();
        user.setUsername(normalized);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setDisplayName(displayName == null || displayName.isBlank() ? normalized : displayName.trim());
        user.setRole(Role.RECRUITER);
        user.setEnabled(true);
        user = userRepository.save(user);
        audit.record(null, "USER", user.getId().toString(), "RECRUITER_CREATED",
                Map.of("email", normalized, "by", actor));
        return user;
    }

    @Transactional(readOnly = true)
    public List<AppUser> recruiters(String q) {
        return userRepository.search(q, Role.RECRUITER);
    }
}
