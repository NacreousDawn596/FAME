package ma.ensam.fame.service;

import ma.ensam.fame.domain.*;
import ma.ensam.fame.repository.StudentRegistrationRepository;
import ma.ensam.fame.repository.StationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.*;

@Service
public class AnalyticsService {

    private final StudentRegistrationRepository registrationRepository;
    private final StationRepository stationRepository;
    private final CampaignAccessService accessService;

    public AnalyticsService(StudentRegistrationRepository registrationRepository,
                            StationRepository stationRepository,
                            CampaignAccessService accessService) {
        this.registrationRepository = registrationRepository;
        this.stationRepository = stationRepository;
        this.accessService = accessService;
    }

    @Transactional(readOnly = true)
    public AnalyticsResult analyze(UUID campaignId, ma.ensam.fame.security.FameUserPrincipal user) {
        accessService.requireCampaignAccess(campaignId, user);
        List<StudentRegistration> registrations =
                registrationRepository.findByCampaignIdOrderBySequenceNoAsc(campaignId);

        // Waiting time = arrival -> called, for students who were at least called.
        List<Long> waitingSeconds = registrations.stream()
                .filter(r -> r.getCalledAt() != null && r.getArrivalAt() != null)
                .map(r -> Duration.between(r.getArrivalAt(), r.getCalledAt()).getSeconds())
                .filter(s -> s >= 0)
                .sorted()
                .toList();

        // Interview duration = start -> complete, for completed interviews.
        List<Long> interviewSeconds = registrations.stream()
                .filter(r -> r.getInterviewStartedAt() != null && r.getCompletedAt() != null)
                .map(r -> Duration.between(r.getInterviewStartedAt(), r.getCompletedAt()).getSeconds())
                .filter(s -> s >= 0)
                .sorted()
                .toList();

        long completed = registrations.stream().filter(r -> r.getStatus() == QueueStatus.COMPLETED).count();
        long absent = registrations.stream().filter(r -> r.getStatus() == QueueStatus.ABSENT).count();
        long withdrawn = registrations.stream().filter(r -> r.getStatus() == QueueStatus.WITHDRAWN).count();
        long waiting = registrations.stream().filter(r -> r.getStatus() == QueueStatus.WAITING).count();
        long inInterview = registrations.stream().filter(r -> r.getStatus() == QueueStatus.IN_INTERVIEW).count();

        Map<String, Long> volumeByFiliere = new HashMap<>();
        for (StudentRegistration r : registrations) {
            String f = r.getFiliere() == null ? "(non renseigné)" : r.getFiliere();
            volumeByFiliere.merge(f, 1L, Long::sum);
        }

        // No-show rate: absent / (absent + completed). Withdrawn/excluded are excluded.
        double noShowRate = (absent + completed) == 0 ? 0.0 : (double) absent / (absent + completed);

        // Station utilization and paused time.
        List<Station> stations = stationRepository.findByCampaignIdOrderByLabel(campaignId);
        Map<String, Object> stationUtilization = new LinkedHashMap<>();
        for (Station s : stations) {
            stationUtilization.put(s.getLabel(), Map.of("status", s.getStatus().name(), "filiere", s.getFiliere()));
        }

        return new AnalyticsResult(
                registrations.size(),
                completed, absent, withdrawn, waiting, inInterview,
                mean(waitingSeconds), median(waitingSeconds),
                mean(interviewSeconds), median(interviewSeconds),
                noShowRate,
                volumeByFiliere,
                stationUtilization);
    }

    private static double mean(List<Long> values) {
        if (values.isEmpty()) return 0.0;
        return values.stream().mapToLong(Long::longValue).average().orElse(0.0);
    }

    private static double median(List<Long> values) {
        if (values.isEmpty()) return 0.0;
        int n = values.size();
        if (n % 2 == 1) return values.get(n / 2);
        return (values.get(n / 2 - 1) + values.get(n / 2)) / 2.0;
    }

    public record AnalyticsResult(
            int totalRegistered,
            long completed, long absent, long withdrawn, long waiting, long inInterview,
            double meanWaitingSeconds, double medianWaitingSeconds,
            double meanInterviewSeconds, double medianInterviewSeconds,
            double noShowRate,
            Map<String, Long> volumeByFiliere,
            Map<String, Object> stationUtilization) {
    }
}
