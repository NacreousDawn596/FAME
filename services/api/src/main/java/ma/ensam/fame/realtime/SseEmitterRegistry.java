package ma.ensam.fame.realtime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Tracks active SSE emitters keyed by a channel string (campaign or student
 * scope) and fans events out to them.
 */
@Component
public class SseEmitterRegistry {

    private static final Logger log = LoggerFactory.getLogger(SseEmitterRegistry.class);
    private static final long TIMEOUT_MS = 60_000L;

    private final ConcurrentHashMap<String, Set<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter register(String channelKey) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        emitters.computeIfAbsent(channelKey, k -> new CopyOnWriteArraySet<>()).add(emitter);

        emitter.onCompletion(() -> remove(channelKey, emitter));
        emitter.onTimeout(() -> remove(channelKey, emitter));
        emitter.onError(e -> remove(channelKey, emitter));

        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException e) {
            remove(channelKey, emitter);
            log.warn("Failed to send initial SSE event: {}", e.getMessage());
        }
        return emitter;
    }

    private void remove(String channelKey, SseEmitter emitter) {
        Set<SseEmitter> set = emitters.get(channelKey);
        if (set != null) {
            set.remove(emitter);
            if (set.isEmpty()) {
                emitters.remove(channelKey);
            }
        }
    }

    public void emit(String channelKey, String json) {
        Set<SseEmitter> set = emitters.get(channelKey);
        if (set == null || set.isEmpty()) {
            return;
        }
        for (SseEmitter emitter : set) {
            try {
                emitter.send(SseEmitter.event().name("event").data(json));
            } catch (IOException e) {
                remove(channelKey, emitter);
            }
        }
    }

    public int activeCount() {
        return emitters.values().stream().mapToInt(Set::size).sum();
    }
}
