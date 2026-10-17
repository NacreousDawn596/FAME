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
 * Seeds a bootstrap administrator on first startup so the platform is usable.
 * No password is committed to the repository; it is read from configuration.
 */
@Configuration
public class DataInitializer {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    @Bean
    public CommandLineRunner seedAdmin(AppUserRepository userRepository,
                                       PasswordEncoder passwordEncoder,
                                       @Value("${fame.bootstrap.admin-username}") String username,
                                       @Value("${fame.bootstrap.admin-password}") String password,
                                       @Value("${fame.bootstrap.admin-display-name}") String displayName) {
        return args -> {
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
        };
    }
}
