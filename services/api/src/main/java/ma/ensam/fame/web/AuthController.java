package ma.ensam.fame.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.StudentRegistration;
import ma.ensam.fame.service.AuthService;
import ma.ensam.fame.security.CurrentUser;
import ma.ensam.fame.security.FameUserPrincipal;
import ma.ensam.fame.security.StudentPrincipal;
import ma.ensam.fame.service.QueueEngine;
import ma.ensam.fame.repository.StudentRegistrationRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final AuthService authService;
    private final StudentRegistrationRepository registrationRepository;

    public AuthController(AuthenticationManager authenticationManager,
                          SecurityContextRepository securityContextRepository,
                          AuthService authService,
                          StudentRegistrationRepository registrationRepository) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.authService = authService;
        this.registrationRepository = registrationRepository;
    }

    /* -------------------------- Unified staff login --------------------- */

    @PostMapping("/login")
    public Map<String, Object> login(@Valid @RequestBody LoginRequest body,
                                     HttpServletRequest request, HttpServletResponse response) {
        // A single login for every DB-backed account (superadmin, admin,
        // organizer, recruiter). Emails are normalized; the backing account
        // uses the email as its username.
        String identifier = normalizeIdentifier(body.email());
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(identifier, body.password()));
        establishSession(auth, request, response);
        FameUserPrincipal principal = (FameUserPrincipal) auth.getPrincipal();
        return Map.of(
                "kind", "staff",
                "id", principal.id().toString(),
                "username", principal.username(),
                "displayName", principal.displayName(),
                "role", principal.role().name());
    }

    private static String normalizeIdentifier(String identifier) {
        if (identifier == null) return null;
        String v = identifier.trim();
        return v.contains("@") ? v.toLowerCase() : v;
    }

    /* --------------------------- Student challenge --------------------- */

    @PostMapping("/student/challenge")
    public Map<String, Object> challenge() {
        AuthService.ChallengeResponse c = authService.createChallenge();
        return Map.of("challenge", c.challenge(), "nonce", c.nonce(), "expiresIn", c.expiresInSeconds());
    }

    @PostMapping("/student/assert")
    public Map<String, Object> studentAssert(@Valid @RequestBody StudentAssertRequest body,
                                             HttpServletRequest request, HttpServletResponse response) {
        AuthService.AssertionResult result = authService.authenticateStudent(body.assertion(), body.campaignId());

        StudentPrincipal principal = new StudentPrincipal(result.registrationId(), result.campaignId(),
                result.studentCode(), result.fullName(), result.email());
        establishSession(new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()),
                request, response);

        StudentRegistration reg = registrationRepository.findById(result.registrationId()).orElseThrow();
        return studentView(reg);
    }

    /* --------------------------- Recovery flow ------------------------- */

    @PostMapping("/recovery/login")
    public Map<String, Object> recoveryLogin(@Valid @RequestBody RecoveryLoginRequest body,
                                             HttpServletRequest request, HttpServletResponse response) {
        AuthService.RecoveryLoginResult result = authService.recoveryLogin(body.username(), body.password());
        StudentRegistration reg = result.registration();
        StudentPrincipal principal = new StudentPrincipal(reg.getId(), reg.getCampaign().getId(),
                reg.getStudentCode(), reg.getFullName(), reg.getEmail());
        establishSession(new UsernamePasswordAuthenticationToken(principal, null, principal.authorities()),
                request, response);

        return Map.of("mustChangePassword", result.mustChangePassword());
    }

    @PostMapping("/recovery/change-password")
    public Map<String, Object> changeRecoveryPassword(@Valid @RequestBody ChangePasswordRequest body) {
        StudentPrincipal student = CurrentUser.student();
        authService.changeRecoveryPassword(student.campaignId(), student.studentCode(), body.newPassword());
        return Map.of("ok", true);
    }

    /* ------------------------------ Logout ----------------------------- */

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return Map.of("ok", true);
    }

    /* ------------------------------ Me --------------------------------- */

    @GetMapping("/me")
    public Map<String, Object> me() {
        if (CurrentUser.isStaff()) {
            FameUserPrincipal p = CurrentUser.staff();
            return Map.of("kind", "staff", "id", p.id().toString(), "username", p.username(),
                    "displayName", p.displayName(), "role", p.role().name());
        }
        if (!CurrentUser.isStudent()) {
            throw ApiException.unauthorized("NOT_AUTHENTICATED", "Authentication required");
        }
        StudentPrincipal s = CurrentUser.student();
        StudentRegistration reg = registrationRepository.findById(s.registrationId())
                .orElseThrow(() -> ApiException.notFound("REGISTRATION_NOT_FOUND", "Registration not found"));
        return Map.of("kind", "student", "registration", studentView(reg));
    }

    private Map<String, Object> studentView(StudentRegistration reg) {
        return Map.of(
                "registrationId", reg.getId().toString(),
                "campaignId", reg.getCampaign().getId().toString(),
                "studentCode", reg.getStudentCode(),
                "fullName", reg.getFullName(),
                "filiere", reg.getFiliere(),
                "status", reg.getStatus().name(),
                "sequenceNo", reg.getSequenceNo(),
                "registeredAt", reg.getRegisteredAt().toString());
    }

    /* ------------------------------ Helpers ---------------------------- */

    private void establishSession(Authentication auth, HttpServletRequest request, HttpServletResponse response) {
        HttpSession session = request.getSession(true);
        request.changeSessionId(); // session fixation protection
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }

    /* ------------------------------ DTOs ------------------------------- */

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {
    }

    public record StudentAssertRequest(@NotBlank String assertion, UUID campaignId) {
    }

    public record RecoveryLoginRequest(@NotBlank String username, @NotBlank String password) {
    }

    public record ChangePasswordRequest(@NotBlank String newPassword) {
    }
}
