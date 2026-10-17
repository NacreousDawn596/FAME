package ma.ensam.fame.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import nl.martijndwars.webpush.Subscription;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.security.GeneralSecurityException;
import java.security.Security;
import java.util.HashMap;
import java.util.Map;

/**
 * Web Push delivery using VAPID. Minimal, privacy-preserving payloads only.
 */
@Service
public class WebPushService {

    private static final Logger log = LoggerFactory.getLogger(WebPushService.class);

    private final PushService pushService;
    private final ObjectMapper objectMapper;

    static {
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
    }

    public WebPushService(
            @Value("${fame.vapid.public-key}") String publicKey,
            @Value("${fame.vapid.private-key}") String privateKey,
            @Value("${fame.vapid.subject}") String subject,
            ObjectMapper objectMapper) throws GeneralSecurityException {
        this.objectMapper = objectMapper;
        if (publicKey == null || publicKey.isBlank() || privateKey == null || privateKey.isBlank()) {
            this.pushService = null;
            log.warn("VAPID keys not configured; web push disabled");
        } else {
            this.pushService = new PushService(publicKey, privateKey, subject);
        }
    }

    public boolean isEnabled() {
        return pushService != null;
    }

    /** Sends a minimal notification payload. Returns true on success. */
    public boolean send(String endpoint, String p256dh, String auth, String title, String body) {
        if (pushService == null) {
            return false;
        }
        try {
            Subscription subscription = new Subscription(endpoint, new Subscription.Keys(p256dh, auth));
            Map<String, Object> message = new HashMap<>();
            message.put("title", title);
            message.put("body", body == null ? "" : body);
            String payload = objectMapper.writeValueAsString(message);

            Notification notification = new Notification(subscription, payload);
            pushService.send(notification);
            return true;
        } catch (Exception e) {
            log.debug("Web push send failed: {}", e.getMessage());
            return false;
        }
    }
}
