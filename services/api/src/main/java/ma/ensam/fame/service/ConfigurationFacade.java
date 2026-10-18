package ma.ensam.fame.service;

import ma.ensam.fame.config.SuperAdminProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Exposes a curated, non-secret view of application configuration to the
 * superadmin. Never returns raw config.yml, secrets, or credentials.
 */
@Component
public class ConfigurationFacade {

    private final SuperAdminProperties superAdminProperties;

    @Value("${fame.cors.origins}")
    private String corsOrigins;

    @Value("${fame.worker.issuer}")
    private String workerIssuer;

    @Value("${fame.worker.audience}")
    private String workerAudience;

    @Value("${fame.worker.assertion-ttl}")
    private String assertionTtl;

    @Value("${fame.vapid.public-key}")
    private String vapidPublicKey;

    @Value("${fame.vapid.private-key}")
    private String vapidPrivateKey;

    @Value("${fame.bootstrap.admin-username}")
    private String bootstrapAdminUsername;

    public ConfigurationFacade(SuperAdminProperties superAdminProperties) {
        this.superAdminProperties = superAdminProperties;
    }

    public Map<String, Object> safeView() {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("corsOrigins", corsOrigins);
        map.put("workerIssuer", workerIssuer);
        map.put("workerAudience", workerAudience);
        map.put("workerAssertionTtl", assertionTtl);
        map.put("vapidPublicKey", vapidPublicKey == null || vapidPublicKey.isBlank() ? null : vapidPublicKey);
        map.put("vapidConfigured", vapidPublicKey != null && !vapidPublicKey.isBlank()
                && vapidPrivateKey != null && !vapidPrivateKey.isBlank());
        map.put("bootstrapAdminUsername", bootstrapAdminUsername);
        map.put("superAdminConfigured", superAdminProperties.isConfigured());
        // Never expose: superadmin email, VAPID private key, DB/Redis passwords.
        return map;
    }
}
