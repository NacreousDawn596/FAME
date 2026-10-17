package ma.ensam.fame.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Allocates a globally monotonic registration sequence number, providing a
 * deterministic FIFO tie-breaker across a campaign.
 */
@Service
public class SequenceAllocator {

    private final JdbcTemplate jdbc;

    public SequenceAllocator(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public long next() {
        Long value = jdbc.queryForObject("SELECT nextval('registration_seq')", Long.class);
        return value == null ? 0L : value;
    }
}
