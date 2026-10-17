package ma.ensam.fame.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Authenticated student principal, scoped to a single campaign registration.
 */
public record StudentPrincipal(
        UUID registrationId,
        UUID campaignId,
        String studentCode,
        String fullName,
        String email
) {
    public Collection<GrantedAuthority> authorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_STUDENT"));
    }
}
