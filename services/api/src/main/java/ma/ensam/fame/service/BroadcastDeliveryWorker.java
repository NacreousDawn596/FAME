package ma.ensam.fame.service;

import ma.ensam.fame.domain.Broadcast;
import ma.ensam.fame.domain.BroadcastRecipient;
import ma.ensam.fame.domain.PushSubscription;
import ma.ensam.fame.repository.BroadcastRecipientRepository;
import ma.ensam.fame.repository.BroadcastRepository;
import ma.ensam.fame.repository.PushSubscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Delivers pending broadcast recipients as Web Push with bounded retries, and
 * finalizes broadcast status. Push is best-effort; in-app SSE is primary.
 */
@Component
public class BroadcastDeliveryWorker {

    private static final Logger log = LoggerFactory.getLogger(BroadcastDeliveryWorker.class);
    private static final int MAX_ATTEMPTS = 5;

    private final BroadcastRecipientRepository recipientRepository;
    private final BroadcastRepository broadcastRepository;
    private final PushSubscriptionRepository subscriptionRepository;
    private final WebPushService webPushService;

    public BroadcastDeliveryWorker(BroadcastRecipientRepository recipientRepository,
                                   BroadcastRepository broadcastRepository,
                                   PushSubscriptionRepository subscriptionRepository,
                                   WebPushService webPushService) {
        this.recipientRepository = recipientRepository;
        this.broadcastRepository = broadcastRepository;
        this.subscriptionRepository = subscriptionRepository;
        this.webPushService = webPushService;
    }

    @Scheduled(fixedDelay = 5000)
    public void deliverPending() {
        List<BroadcastRecipient> pending = recipientRepository
                .findTop100ByStatusInOrderByIdAsc(List.of(BroadcastRecipient.Status.PENDING));

        // Group recipients by broadcast for efficient status finalization.
        Map<java.util.UUID, Broadcast> broadcasts = broadcastRepository
                .findAllById(pending.stream().map(BroadcastRecipient::getBroadcastId).distinct().toList())
                .stream().collect(Collectors.toMap(Broadcast::getId, Function.identity()));

        for (BroadcastRecipient recipient : pending) {
            boolean delivered = false;
            List<PushSubscription> subs = subscriptionRepository.findByRegistrationId(recipient.getRegistrationId());
            Broadcast broadcast = broadcasts.get(recipient.getBroadcastId());
            String title = broadcast == null ? "FAME" : broadcast.getTitle();
            String body = broadcast == null ? "" : broadcast.getBody();

            for (PushSubscription sub : subs) {
                if (sub.getExpiresAt() != null && sub.getExpiresAt().isBefore(Instant.now())) {
                    continue;
                }
                if (webPushService.isEnabled()
                        && webPushService.send(sub.getEndpoint(), sub.getP256dh(), sub.getAuth(), title, body)) {
                    delivered = true;
                }
            }

            recipient.setAttempts(recipient.getAttempts() + 1);
            if (delivered || subs.isEmpty() || !webPushService.isEnabled()) {
                recipient.setStatus(BroadcastRecipient.Status.SENT);
                recipient.setSentAt(Instant.now());
            } else if (recipient.getAttempts() >= MAX_ATTEMPTS) {
                recipient.setStatus(BroadcastRecipient.Status.FAILED);
                recipient.setLastError("Max attempts reached");
            }
            recipientRepository.save(recipient);
        }

        finalizeBroadcasts(broadcasts.values());
    }

    private void finalizeBroadcasts(Iterable<Broadcast> broadcasts) {
        for (Broadcast broadcast : broadcasts) {
            List<BroadcastRecipient> recipients =
                    recipientRepository.findByBroadcastIdOrderByStatusAsc(broadcast.getId());
            long sent = recipients.stream().filter(r -> r.getStatus() == BroadcastRecipient.Status.SENT).count();
            long failed = recipients.stream().filter(r -> r.getStatus() == BroadcastRecipient.Status.FAILED).count();
            broadcast.setDeliveredCount((int) sent);
            broadcast.setFailedCount((int) failed);
            if (sent + failed >= recipients.size() && !recipients.isEmpty()) {
                broadcast.setStatus(failed > 0 ? Broadcast.Status.PARTIAL : Broadcast.Status.SENT);
                broadcast.setSentAt(Instant.now());
            }
            broadcastRepository.save(broadcast);
        }
    }
}
