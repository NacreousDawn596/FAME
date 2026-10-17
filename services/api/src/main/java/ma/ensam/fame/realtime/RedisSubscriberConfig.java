package ma.ensam.fame.realtime;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.connection.MessageListener;

@Configuration
public class RedisSubscriberConfig {

    private final SseEmitterRegistry registry;

    public RedisSubscriberConfig(SseEmitterRegistry registry) {
        this.registry = registry;
    }

    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(
            RedisConnectionFactory connectionFactory) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);

        MessageListener listener = (message, pattern) -> {
            String channel = new String(message.getChannel());
            String body = new String(message.getBody());
            registry.emit(channel, body);
        };

        container.addMessageListener(listener, new PatternTopic("fame:campaign:*"));
        container.addMessageListener(listener, new PatternTopic("fame:student:*"));
        return container;
    }
}
