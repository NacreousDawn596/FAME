package ma.ensam.fame.service;

import ma.ensam.fame.domain.*;
import ma.ensam.fame.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Aggregated operational overview for the superadmin control center. Reads
 * only aggregate counts and sanitized recent activity — never student-level
 * data in a global chart.
 */
@Service
public class AdminOverviewService {

    private final CampaignRepository campaignRepository;
    private final StudentRegistrationRepository registrationRepository;
    private final StationRepository stationRepository;
    private final QueueEventRepository eventRepository;
    private final BroadcastRepository broadcastRepository;
    private final AppUserRepository userRepository;

    public AdminOverviewService(CampaignRepository campaignRepository,
                                StudentRegistrationRepository registrationRepository,
                                StationRepository stationRepository,
                                QueueEventRepository eventRepository,
                                BroadcastRepository broadcastRepository,
                                AppUserRepository userRepository) {
        this.campaignRepository = campaignRepository;
        this.registrationRepository = registrationRepository;
        this.stationRepository = stationRepository;
        this.eventRepository = eventRepository;
        this.broadcastRepository = broadcastRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> overview() {
        Map<String, Object> result = new LinkedHashMap<>();

        Map<String, Long> campaigns = new LinkedHashMap<>();
        for (CampaignStatus s : CampaignStatus.values()) {
            campaigns.put(s.name(), campaignRepository.countByStatus(s));
        }
        result.put("campaigns", campaigns);

        Map<String, Long> students = new LinkedHashMap<>();
        students.put("registered", registrationRepository.count());
        students.put("waiting", registrationRepository.countByStatusIn(
                List.of(QueueStatus.WAITING, QueueStatus.APPROACHING)));
        students.put("called", registrationRepository.countByStatusIn(
                List.of(QueueStatus.CALLED, QueueStatus.DISPATCH_READY)));
        students.put("inInterview", registrationRepository.countByStatusIn(List.of(QueueStatus.IN_INTERVIEW)));
        students.put("completed", registrationRepository.countByStatusIn(List.of(QueueStatus.COMPLETED)));
        students.put("absent", registrationRepository.countByStatusIn(List.of(QueueStatus.ABSENT)));
        result.put("students", students);

        Map<String, Long> stations = new LinkedHashMap<>();
        stations.put("available", stationRepository.countByStatus(StationStatus.AVAILABLE));
        stations.put("occupied", stationRepository.countByStatus(StationStatus.OCCUPIED));
        stations.put("paused", stationRepository.countByStatus(StationStatus.PAUSED));
        result.put("stations", stations);

        result.put("staffUsers", userRepository.count());

        result.put("recentActions", eventRepository.findTop200ByOrderByOccurredAtDesc().stream()
                .limit(20)
                .map(e -> Map.of(
                        "id", e.getId().toString(),
                        "action", e.getAction(),
                        "entityType", e.getEntityType(),
                        "actorRole", e.getActorRole(),
                        "occurredAt", e.getOccurredAt().toString()))
                .toList());

        result.put("recentBroadcasts", broadcastRepository
                .findByOrderByCreatedAtDesc(org.springframework.data.domain.PageRequest.of(0, 10)).stream()
                .map(b -> Map.of(
                        "id", b.getId().toString(),
                        "segment", b.getSegment(),
                        "title", b.getTitle(),
                        "status", b.getStatus().name(),
                        "targetCount", b.getTargetCount(),
                        "deliveredCount", b.getDeliveredCount(),
                        "createdAt", b.getCreatedAt().toString()))
                .toList());

        return result;
    }
}
