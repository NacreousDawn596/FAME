package ma.ensam.fame.security;

import ma.ensam.fame.domain.AppUser;
import ma.ensam.fame.repository.AppUserRepository;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class StaffAuthenticationProvider implements AuthenticationProvider {

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public StaffAuthenticationProvider(AppUserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        String username = authentication.getName();
        String password = authentication.getCredentials() == null ? null : authentication.getCredentials().toString();

        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new BadCredentialsException("Invalid credentials"));

        if (!user.isEnabled()) {
            throw new DisabledException("Account disabled");
        }
        if (!passwordEncoder.matches(password == null ? "" : password, user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid credentials");
        }

        FameUserPrincipal principal = new FameUserPrincipal(user.getId(), user.getUsername(), user.getDisplayName(), user.getRole());
        UsernamePasswordAuthenticationToken result =
                new UsernamePasswordAuthenticationToken(principal, null, principal.authorities());
        result.setDetails(authentication.getDetails());
        return result;
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
    }
}
