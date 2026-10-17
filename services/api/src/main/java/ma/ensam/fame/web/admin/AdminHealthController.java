package ma.ensam.fame.web.admin;

import ma.ensam.fame.config.SuperAdminProperties;
import ma.ensam.fame.repository.BroadcastRecipientRepository;
import ma.ensam.fame.service.ConfigurationFacade;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Authorized operational diagnostics. Reports checked conditions only — never
 * hardcoded statuses, and never secrets or environment variables.
 */
@RestController
@RequestMapping("/api/admin/health")
public class AdminHealthController {

    private final JdbcTemplate jdbc;
    private final StringRedisTemplate redis;
    private final ConfigurationFacade facade;
    private final SuperAdminProperties superAdminProperties;
    private final BroadcastRecipientRepository recipientRepository;

    @Value("${spring.application.name}")
    private String applicationName;

    public AdminHealthController(JdbcTemplate jdbc,
                                 StringRedisTemplate redis,
                                 ConfigurationFacade facade,
                                 SuperAdminProperties superAdminProperties,
                                 BroadcastRecipientRepository recipientRepository) {
        this.jdbc = jdbc;
        this.redis = redis;
        this.facade = facade;
        this.superAdminProperties = superAdminProperties;
        this.recipientRepository = recipientRepository;
    }

    @GetMapping
    public Map<String, Object> health() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("application", applicationName);
        result.put("database", check("database", () -> jdbc.queryForObject("SELECT 1", Integer.class) != null));
        result.put("redis", check("redis", () -> redis.getConnectionFactory().getConnection().ping() != null));
        result.put("vapidConfigured", facade.safeView().get("vapidConfigured"));
        result.put("superAdminConfigured", superAdminProperties.email() != null && !superAdminProperties.email().isBlank());
        result.put("pendingPushDeliveries",
                recipientRepository.findTop100ByStatusInOrderByIdAsc(
                        List.of(ma.ensam.fame.domain.BroadcastRecipient.Status.PENDING)).size());
        return result;
    }

    private Map<String, Object> check(String name, Check c) {
        try {
            c.run();
            return Map.of("status", "UP");
        } catch (Exception e) {
            return Map.of("status", "DOWN", "detail", "unavailable");
        }
    }

    @FunctionalInterface
    private interface Check {
        boolean run() throws Exception;
    }
}
