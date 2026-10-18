package ma.ensam.fame.config;

import ma.ensam.fame.domain.AppUser;
import ma.ensam.fame.domain.Role;
import ma.ensam.fame.repository.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Seeds bootstrap accounts on first startup. No password is committed to the
 * repository; everything is read from configuration.
 */
@Configuration
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    @Bean
    public CommandLineRunner seedAdmin(AppUserRepository userRepository,
                                       PasswordEncoder passwordEncoder,
                                       SuperAdminProperties superAdmin,
                                       @Value("${fame.bootstrap.admin-username}") String username,
                                       @Value("${fame.bootstrap.admin-password}") String password,
                                       @Value("${fame.bootstrap.admin-display-name}") String displayName) {
        return args -> {
            seedSuperAdmin(userRepository, passwordEncoder, superAdmin);
            seedBootstrapAdmin(userRepository, passwordEncoder, username, password, displayName);
        };
    }

    private void seedSuperAdmin(AppUserRepository userRepository, PasswordEncoder passwordEncoder,
                                SuperAdminProperties superAdmin) {
        String email = superAdmin.normalizedEmail();
        if (email == null || !superAdmin.isConfigured()) {
            log.warn("Superadmin email/password not configured; superadmin will not be created.");
            return;
        }
        if (userRepository.existsByUsername(email)) {
            return;
        }
        AppUser admin = new AppUser();
        admin.setUsername(email);
        admin.setPasswordHash(passwordEncoder.encode(superAdmin.password()));
        admin.setDisplayName("Superadmin");
        admin.setRole(Role.SUPERADMIN);
        admin.setEnabled(true);
        userRepository.save(admin);
        log.info("Superadmin '{}' created.", email);
    }

    private void seedBootstrapAdmin(AppUserRepository userRepository, PasswordEncoder passwordEncoder,
                                    String username, String password, String displayName) {
        if (userRepository.existsByUsername(username)) {
            return;
        }
        if (password == null || password.isBlank()) {
            log.warn("Bootstrap admin password not configured; admin user will not be created.");
            return;
        }
        AppUser admin = new AppUser();
        admin.setUsername(username);
        admin.setPasswordHash(passwordEncoder.encode(password));
        admin.setDisplayName(displayName);
        admin.setRole(Role.ADMIN);
        admin.setEnabled(true);
        userRepository.save(admin);
        log.info("Bootstrap administrator '{}' created.", username);
    }
}
