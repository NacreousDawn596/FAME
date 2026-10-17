package ma.ensam.fame.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Superadmin bootstrap identity configuration. The designated superadmin is
 * identified by a verified institutional email (SchoolApp), NOT a password.
 * This binding is the single source of truth for the superadmin identity.
 */
@ConfigurationProperties(prefix = "fame.admin")
public record SuperAdminProperties(String email) {
}
