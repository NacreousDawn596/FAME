package ma.ensam.fame.web.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import ma.ensam.fame.domain.*;
import ma.ensam.fame.security.CurrentUser;
import ma.ensam.fame.service.AdminUserService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
public class AdminUsersController {

    private final AdminUserService userService;

    public AdminUsersController(AdminUserService userService) {
        this.userService = userService;
    }

    @GetMapping("/users")
    public List<Map<String, Object>> staff(@RequestParam(required = false) String q,
                                           @RequestParam(required = false) Role role) {
        return userService.staff(q, role).stream().map(this::staffView).toList();
    }

    @PatchMapping("/users/{userId}/enabled")
    public Map<String, Object> setEnabled(@PathVariable UUID userId, @RequestBody EnabledRequest body) {
        AppUser user = userService.setEnabled(userId, body.enabled(), actor());
        return staffView(user);
    }

    @PatchMapping("/users/{userId}/role")
    public Map<String, Object> setRole(@PathVariable UUID userId, @RequestBody RoleRequest body) {
        AppUser user = userService.setRole(userId, body.role(), actor());
        return staffView(user);
    }

    @GetMapping("/students")
    public List<Map<String, Object>> students(@RequestParam(required = false) String q,
                                              @RequestParam(required = false) UUID campaignId,
                                              @RequestParam(required = false) QueueStatus status,
                                              @RequestParam(required = false) String filiere,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "50") int size) {
        return userService.students(q, campaignId, status, filiere, page, size).stream()
                .map(ma.ensam.fame.web.Views::registration).toList();
    }

    @PostMapping("/users/{username}/revoke-sessions")
    public Map<String, Object> revokeSessions(@PathVariable String username) {
        int count = userService.revokeUserSessions(username, actor());
        return Map.of("revoked", count);
    }

    @GetMapping("/recovery-accounts")
    public List<Map<String, Object>> recoveryAccounts(@RequestParam(required = false) UUID campaignId) {
        return userService.recoveryAccounts(campaignId).stream()
                .map(a -> Map.<String, Object>of(
                        "id", a.getId().toString(),
                        "username", a.getUsername(),
                        "studentCode", a.getStudentCode(),
                        "mustChangePassword", a.isMustChangePassword(),
                        "expiresAt", a.getExpiresAt() == null ? "" : a.getExpiresAt().toString(),
                        "usedAt", a.getUsedAt() == null ? "" : a.getUsedAt().toString()))
                .toList();
    }

    private Map<String, Object> staffView(AppUser u) {
        return Map.of(
                "id", u.getId().toString(),
                "username", u.getUsername(),
                "displayName", u.getDisplayName(),
                "role", u.getRole().name(),
                "enabled", u.isEnabled(),
                "createdAt", u.getCreatedAt().toString());
    }

    private String actor() {
        return CurrentUser.staff().username();
    }

    public record EnabledRequest(@NotNull Boolean enabled) {
    }

    public record RoleRequest(@NotNull Role role) {
    }
}
