package ma.ensam.fame.service;

import ma.ensam.fame.domain.NotificationRecord;
import ma.ensam.fame.domain.PushSubscription;
import ma.ensam.fame.repository.NotificationRecordRepository;
import ma.ensam.fame.repository.PushSubscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/**
 * Delivers pending notifications as Web Push, with bounded retries. Push is an
 * enhancement; in-app SSE delivery is the primary notification channel.
 */
@Component
public class PushDeliveryWorker {

    private static final Logger log = LoggerFactory.getLogger(PushDeliveryWorker.class);
    private static final int MAX_ATTEMPTS = 5;

    private final NotificationRecordRepository recordRepository;
    private final PushSubscriptionRepository subscriptionRepository;
    private final WebPushService webPushService;

    public PushDeliveryWorker(NotificationRecordRepository recordRepository,
                              PushSubscriptionRepository subscriptionRepository,
                              WebPushService webPushService) {
        this.recordRepository = recordRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.webPushService = webPushService;
    }

    @Scheduled(fixedDelay = 5000)
    public void deliverPending() {
        if (!webPushService.isEnabled()) {
            return;
        }
        List<NotificationRecord> pending = recordRepository
                .findTop50ByStatusInOrderByCreatedAtAsc(List.of("PENDING", "RETRY"));

        for (NotificationRecord record : pending) {
            boolean delivered = false;
            List<PushSubscription> subs = subscriptionRepository.findByRegistrationId(record.getRegistrationId());
            for (PushSubscription sub : subs) {
                if (sub.getExpiresAt() != null && sub.getExpiresAt().isBefore(Instant.now())) {
                    continue;
                }
                if (webPushService.send(sub.getEndpoint(), sub.getP256dh(), sub.getAuth(),
                        record.getPayload(), null)) {
                    delivered = true;
                }
            }

            record.setAttempts(record.getAttempts() + 1);
            if (delivered || subs.isEmpty()) {
                record.setStatus("SENT");
                record.setSentAt(Instant.now());
            } else if (record.getAttempts() >= MAX_ATTEMPTS) {
                record.setStatus("FAILED");
                record.setLastError("Max attempts reached");
            } else {
                record.setStatus("RETRY");
            }
            recordRepository.save(record);
        }
    }
}
