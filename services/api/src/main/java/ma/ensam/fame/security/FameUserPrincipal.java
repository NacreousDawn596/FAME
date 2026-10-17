package ma.ensam.fame.security;

import ma.ensam.fame.domain.Role;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * Authenticated staff (admin / organizer) principal.
 */
public record FameUserPrincipal(
        UUID id,
        String username,
        String displayName,
        Role role
) {
    public Collection<GrantedAuthority> authorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }
}
