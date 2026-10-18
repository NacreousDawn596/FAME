package ma.ensam.fame.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Superadmin bootstrap identity configuration. The designated superadmin is
 * identified by an email + password (DB-backed), seeded on first startup.
 * This binding is the single source of truth for the superadmin identity.
 */
@ConfigurationProperties(prefix = "fame.admin")
public record SuperAdminProperties(String email, String password) {

    public String normalizedEmail() {
        return email == null ? null : email.trim().toLowerCase();
    }

    public boolean isConfigured() {
        return email != null && !email.isBlank() && password != null && !password.isBlank();
    }
}
