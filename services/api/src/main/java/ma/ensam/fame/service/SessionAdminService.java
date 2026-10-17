package ma.ensam.fame.service;

import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Lists and revokes active Spring Session entries by principal name, backed by
 * the Redis-indexed session repository.
 */
@Service
public class SessionAdminService {

    private final FindByIndexNameSessionRepository<? extends Session> repository;

    public SessionAdminService(FindByIndexNameSessionRepository<? extends Session> repository) {
        this.repository = repository;
    }

    public List<String> sessionsFor(String principalName) {
        return repository.findByPrincipalName(principalName).keySet().stream().sorted().toList();
    }

    public int revokeSessions(String principalName) {
        Map<String, ? extends Session> sessions = repository.findByPrincipalName(principalName);
        sessions.keySet().forEach(repository::deleteById);
        return sessions.size();
    }
}
