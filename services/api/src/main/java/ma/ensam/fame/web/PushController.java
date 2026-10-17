package ma.ensam.fame.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import ma.ensam.fame.domain.PushSubscription;
import ma.ensam.fame.domain.StudentRegistration;
import ma.ensam.fame.repository.PushSubscriptionRepository;
import ma.ensam.fame.repository.StudentRegistrationRepository;
import ma.ensam.fame.security.CurrentUser;
import ma.ensam.fame.security.StudentPrincipal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
public class PushController {

    private final PushSubscriptionRepository subscriptionRepository;
    private final StudentRegistrationRepository registrationRepository;

    @Value("${fame.vapid.public-key}")
    private String vapidPublicKey;

    public PushController(PushSubscriptionRepository subscriptionRepository,
                          StudentRegistrationRepository registrationRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.registrationRepository = registrationRepository;
    }

    @GetMapping("/push/vapid-public-key")
    public Map<String, Object> publicKey() {
        CurrentUser.student(); // require student session
        return Map.of("publicKey", vapidPublicKey == null ? "" : vapidPublicKey);
    }

    @PostMapping("/push/subscribe")
    public Map<String, Object> subscribe(@Valid @RequestBody SubscriptionRequest body) {
        StudentPrincipal student = CurrentUser.student();
        StudentRegistration reg = registrationRepository.findById(student.registrationId())
                .orElseThrow();

        PushSubscription sub = subscriptionRepository
                .findByRegistrationIdAndEndpoint(reg.getId(), body.endpoint())
                .orElseGet(PushSubscription::new);
        sub.setRegistration(reg);
        sub.setEndpoint(body.endpoint());
        sub.setP256dh(body.keys().p256dh());
        sub.setAuth(body.keys().auth());
        sub.setExpiresAt(body.expirationTime() == null ? null : Instant.ofEpochSecond(body.expirationTime()));
        subscriptionRepository.save(sub);
        return Map.of("ok", true);
    }

    @DeleteMapping("/push/unsubscribe")
    public Map<String, Object> unsubscribe(@RequestParam String endpoint) {
        StudentPrincipal student = CurrentUser.student();
        subscriptionRepository.deleteByRegistrationIdAndEndpoint(student.registrationId(), endpoint);
        return Map.of("ok", true);
    }

    public record SubscriptionRequest(@NotBlank String endpoint, Keys keys, Long expirationTime) {
        public record Keys(@NotBlank String p256dh, @NotBlank String auth) {
        }
    }
}
