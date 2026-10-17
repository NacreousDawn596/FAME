package ma.ensam.fame.realtime;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

/**
 * Real-time event fan-out. Events are published to Redis channels and fanned
 * out locally to connected SSE emitters, enabling horizontal scaling.
 */
@Service
public class RealtimeService {

    private static final Logger log = LoggerFactory.getLogger(RealtimeService.class);

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;
    private final SseEmitterRegistry registry;

    public RealtimeService(StringRedisTemplate redis, ObjectMapper objectMapper,
                           SseEmitterRegistry registry) {
        this.redis = redis;
        this.objectMapper = objectMapper;
        this.registry = registry;
    }

    public void publishToCampaign(UUID campaignId, String type, Map<String, Object> payload) {
        publish("fame:campaign:" + campaignId, type, campaignId.toString(), payload);
    }

    public void publishToStudent(UUID registrationId, UUID campaignId, String type, Map<String, Object> payload) {
        publish("fame:student:" + registrationId, type, campaignId.toString(), payload);
    }

    private void publish(String channel, String type, String campaignId, Map<String, Object> payload) {
        RealtimeEvent event = new RealtimeEvent(type, campaignId, payload);
        String json;
        try {
            json = objectMapper.writeValueAsString(event);
        } catch (Exception e) {
            log.error("Failed to serialize realtime event", e);
            return;
        }
        registry.emit(channel, json);
        try {
            redis.convertAndSend(channel, json);
        } catch (Exception e) {
            log.warn("Redis publish failed (local delivery already done): {}", e.getMessage());
        }
    }

    public record RealtimeEvent(String type, String campaignId, Map<String, Object> data) {
    }
}
