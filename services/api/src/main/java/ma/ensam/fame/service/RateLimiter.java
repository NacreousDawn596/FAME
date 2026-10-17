package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Simple fixed-window rate limiter backed by Redis (INCR + EXPIRE). Shared
 * across instances; degrades to permissive on Redis failure so availability
 * is not sacrificed for a security control that has a bounded purpose.
 */
@Component
public class RateLimiter {

    private final StringRedisTemplate redis;

    public RateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public void check(String key, int maxRequests, Duration window) {
        try {
            Long count = redis.opsForValue().increment(key);
            if (count != null && count == 1L) {
                redis.expire(key, window);
            }
            if (count != null && count > maxRequests) {
                throw ApiException.tooManyRequests("RATE_LIMITED", "Too many requests, try again later");
            }
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            // Redis unavailable — allow the request (fail-open, documented).
        }
    }
}
