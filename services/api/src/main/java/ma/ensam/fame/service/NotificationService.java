package ma.ensam.fame.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.ensam.fame.domain.NotificationRecord;
import ma.ensam.fame.domain.Recruiter;
import ma.ensam.fame.domain.Station;
import ma.ensam.fame.domain.StudentRegistration;
import ma.ensam.fame.realtime.RealtimeService;
import ma.ensam.fame.repository.NotificationRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Records and delivers candidate notifications. Payloads are minimal (no
 * private academic data), deduplicated, and delivered via SSE (in-app) with
 * an asynchronous Web Push attempt. Notifications are never authorization.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRecordRepository repository;
    private final RealtimeService realtime;
    private final ObjectMapper objectMapper;

    public NotificationService(NotificationRecordRepository repository,
                               RealtimeService realtime,
                               ObjectMapper objectMapper) {
        this.repository = repository;
        this.realtime = realtime;
        this.objectMapper = objectMapper;
    }

    public void notifyRegistration(StudentRegistration reg) {
        emit(reg, "REGISTRATION", "Registration confirmed", Map.of());
    }

    public void notifyPreAlert(StudentRegistration reg) {
        emit(reg, "PRE_ALERT", "Preparez-vous, votre passage approche", Map.of());
    }

    public void notifyCall(StudentRegistration reg, Station station) {
        Map<String, Object> data = new HashMap<>();
        data.put("stationLabel", station.getLabel());
        data.put("locationLabel", station.getLocationLabel());
        Recruiter recruiter = station.getRecruiter();
        if (recruiter != null) {
            data.put("recruiterName", recruiter.getFullName());
            data.put("recruiterPhotoUrl", recruiter.getPhotoUrl());
        }
        emit(reg, "CALLED", "Vous etes appele en entretien", data);
    }

    public void notifyDispatchReady(StudentRegistration reg, Station station) {
        emit(reg, "DISPATCH_READY", "Rendez-vous a la zone de dispatching",
                Map.of("stationLabel", station.getLabel()));
    }

    public void notifyInterviewStart(StudentRegistration reg, Station station) {
        emit(reg, "IN_INTERVIEW", "Votre entretien est en cours",
                Map.of("stationLabel", station.getLabel()));
    }

    public void notifyAbsent(StudentRegistration reg) {
        emit(reg, "ABSENT", "Vous avez ete marque absent", Map.of());
    }

    public void notifyCompleted(StudentRegistration reg) {
        emit(reg, "COMPLETED", "Entretien termine", Map.of());
    }

    private void emit(StudentRegistration reg, String type, String title, Map<String, Object> extra) {
        UUID registrationId = reg.getId();
        UUID campaignId = reg.getCampaign().getId();

        // Deduplicated record keyed by registration + event type.
        String dedupKey = registrationId + ":" + type;
        if (repository.findByDedupKey(dedupKey).isPresent()) {
            return;
        }
        NotificationRecord record = new NotificationRecord();
        record.setRegistrationId(registrationId);
        record.setEventType(type);
        record.setDedupKey(dedupKey);
        record.setStatus("PENDING");
        record.setPayload(title);
        repository.save(record);

        Map<String, Object> payload = new HashMap<>(extra);
        payload.put("title", title);
        payload.put("type", type);
        realtime.publishToStudent(registrationId, campaignId, "NOTIFICATION", payload);
    }
}
