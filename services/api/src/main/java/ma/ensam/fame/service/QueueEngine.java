package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.*;
import ma.ensam.fame.realtime.RealtimeService;
import ma.ensam.fame.repository.StationRepository;
import ma.ensam.fame.repository.StudentRegistrationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

import static ma.ensam.fame.service.QueueStateMachine.AVAILABLE;

/**
 * Authoritative queue engine. All FIFO ordering, candidate selection, and
 * state transitions are performed server-side within transactions. The server
 * is the only source of truth for ordering, timestamps and assignments.
 */
@Service
public class QueueEngine {

    private static final Logger log = LoggerFactory.getLogger(QueueEngine.class);

    private final StudentRegistrationRepository registrationRepository;
    private final StationRepository stationRepository;
    private final QueueStateMachine stateMachine;
    private final SequenceAllocator sequenceAllocator;
    private final RealtimeService realtime;
    private final AuditService audit;
    private final NotificationService notifications;

    public QueueEngine(StudentRegistrationRepository registrationRepository,
                       StationRepository stationRepository,
                       QueueStateMachine stateMachine,
                       SequenceAllocator sequenceAllocator,
                       RealtimeService realtime,
                       AuditService audit,
                       NotificationService notifications) {
        this.registrationRepository = registrationRepository;
        this.stationRepository = stationRepository;
        this.stateMachine = stateMachine;
        this.sequenceAllocator = sequenceAllocator;
        this.realtime = realtime;
        this.audit = audit;
        this.notifications = notifications;
    }

    /* ------------------------------------------------------------------ */
    /* Registration                                                        */
    /* ------------------------------------------------------------------ */

    @Transactional
    public StudentRegistration register(Campaign campaign, String studentCode, String email,
                                        String fullName, String filiere, boolean recovery) {
        String code = normalize(studentCode);
        if (registrationRepository.existsByCampaignIdAndStudentCode(campaign.getId(), code)) {
            return registrationRepository.findByCampaignIdAndStudentCode(campaign.getId(), code)
                    .orElseThrow();
        }

        StudentRegistration reg = new StudentRegistration();
        reg.setCampaign(campaign);
        reg.setStudentCode(code);
        reg.setEmail(email);
        reg.setFullName(fullName);
        reg.setFiliere(filiere);
        reg.setSequenceNo(sequenceAllocator.next());
        reg.setArrivalAt(Instant.now());
        reg.setStatus(QueueStatus.WAITING);
        reg.setRecoveryAccount(recovery);
        reg.setRegisteredAt(Instant.now());
        reg = registrationRepository.save(reg);

        audit.record(campaign.getId(), "REGISTRATION", reg.getId().toString(), "REGISTERED",
                Map.of("filiere", filiere == null ? "" : filiere));
        realtime.publishToCampaign(campaign.getId(), "QUEUE_UPDATED", Map.of("registrationId", reg.getId()));
        notifications.notifyRegistration(reg);
        return reg;
    }

    /* ------------------------------------------------------------------ */
    /* Selection (read)                                                    */
    /* ------------------------------------------------------------------ */

    @Transactional(readOnly = true)
    public List<StudentRegistration> nextCandidates(Campaign campaign, String filiere) {
        return registrationRepository.findAvailableByFiliere(
                campaign.getId(), filiere, List.copyOf(AVAILABLE));
    }

    /** Anti-famine: candidates from other filières, FIFO order. */
    @Transactional(readOnly = true)
    public List<StudentRegistration> alternativeCandidates(Campaign campaign, String excludeFiliere) {
        return registrationRepository.findByCampaignAndStatusInOrderBySequence(
                        campaign.getId(), List.copyOf(AVAILABLE))
                .stream()
                .filter(r -> excludeFiliere == null || !excludeFiliere.equalsIgnoreCase(r.getFiliere()))
                .toList();
    }

    /* ------------------------------------------------------------------ */
    /* Call (atomic claim)                                                 */
    /* ------------------------------------------------------------------ */

    @Transactional
    public Optional<StudentRegistration> call(Campaign campaign, UUID stationId) {
        Station station = station(campaign.getId(), stationId);
        if (station.getStatus() == StationStatus.PAUSED) {
            throw ApiException.conflict("STATION_PAUSED", "Station is paused");
        }

        Optional<StudentRegistration> claimed =
                registrationRepository.claimNextForFiliere(campaign.getId(), station.getFiliere());

        if (claimed.isEmpty()) {
            return Optional.empty();
        }

        StudentRegistration reg = claimed.get();
        stateMachine.assertTransition(reg.getStatus(), QueueStatus.CALLED);
        reg.setStatus(QueueStatus.CALLED);
        reg.setStation(station);
        reg.setCalledAt(Instant.now());
        registrationRepository.save(reg);

        if (station.getStatus() == StationStatus.AVAILABLE) {
            station.setStatus(StationStatus.OCCUPIED);
            stationRepository.save(station);
        }

        audit.record(campaign.getId(), "REGISTRATION", reg.getId().toString(), "CALLED",
                Map.of("stationId", station.getId().toString()));
        publishQueue(campaign.getId());
        publishStation(campaign.getId(), station.getId());
        notifications.notifyCall(reg, station);
        return Optional.of(reg);
    }

    /* ------------------------------------------------------------------ */
    /* Preparation buffer ("sas")                                          */
    /* ------------------------------------------------------------------ */

    @Transactional
    public void prepareDispatch(Campaign campaign, UUID registrationId, UUID stationId) {
        StudentRegistration reg = locked(registrationId, campaign.getId());
        Station station = station(campaign.getId(), stationId);
        stateMachine.assertTransition(reg.getStatus(), QueueStatus.DISPATCH_READY);
        reg.setStatus(QueueStatus.DISPATCH_READY);
        reg.setStation(station);
        registrationRepository.save(reg);

        audit.record(campaign.getId(), "REGISTRATION", reg.getId().toString(), "DISPATCH_READY",
                Map.of("stationId", station.getId().toString()));
        publishQueue(campaign.getId());
        publishStation(campaign.getId(), station.getId());
        notifications.notifyDispatchReady(reg, station);
    }

    /* ------------------------------------------------------------------ */
    /* Dispatch (final presence confirmation)                              */
    /* ------------------------------------------------------------------ */

    @Transactional
    public void confirmPresence(Campaign campaign, UUID registrationId, UUID stationId) {
        StudentRegistration reg = locked(registrationId, campaign.getId());
        Station station = station(campaign.getId(), stationId);
        if (reg.getStatus() == QueueStatus.CALLED) {
            stateMachine.assertTransition(reg.getStatus(), QueueStatus.IN_INTERVIEW);
        } else {
            stateMachine.assertTransition(reg.getStatus(), QueueStatus.IN_INTERVIEW);
        }
        reg.setStatus(QueueStatus.IN_INTERVIEW);
        reg.setStation(station);
        reg.setInterviewStartedAt(Instant.now());
        registrationRepository.save(reg);

        station.setStatus(StationStatus.OCCUPIED);
        stationRepository.save(station);

        audit.record(campaign.getId(), "REGISTRATION", reg.getId().toString(), "DISPATCHED",
                Map.of("stationId", station.getId().toString()));
        publishQueue(campaign.getId());
        publishStation(campaign.getId(), station.getId());
        notifications.notifyInterviewStart(reg, station);
    }

    /* ------------------------------------------------------------------ */
    /* Absence                                                             */
    /* ------------------------------------------------------------------ */

    @Transactional
    public void markAbsent(Campaign campaign, UUID registrationId) {
        StudentRegistration reg = locked(registrationId, campaign.getId());
        if (reg.getStatus() != QueueStatus.CALLED && reg.getStatus() != QueueStatus.DISPATCH_READY) {
            throw ApiException.conflict("INVALID_TRANSITION",
                    "Cannot mark absent from " + reg.getStatus());
        }
        stateMachine.assertTransition(reg.getStatus(), QueueStatus.ABSENT);
        reg.setStatus(QueueStatus.ABSENT);
        Station previous = reg.getStation();
        reg.setStation(null);
        registrationRepository.save(reg);

        if (previous != null) {
            refreshStationAvailability(previous);
        }

        audit.record(campaign.getId(), "REGISTRATION", reg.getId().toString(), "ABSENT", Map.of());
        publishQueue(campaign.getId());
        notifications.notifyAbsent(reg);
    }

    /* ------------------------------------------------------------------ */
    /* Reschedule (ABSENT -> DEFERRED)                                     */
    /* ------------------------------------------------------------------ */

    @Transactional
    public void reschedule(Campaign campaign, UUID registrationId) {
        StudentRegistration reg = locked(registrationId, campaign.getId());
        stateMachine.assertTransition(reg.getStatus(), QueueStatus.DEFERRED);
        reg.setStatus(QueueStatus.DEFERRED);
        registrationRepository.save(reg);

        audit.record(campaign.getId(), "REGISTRATION", reg.getId().toString(), "DEFERRED", Map.of());
        publishQueue(campaign.getId());
    }

    /* ------------------------------------------------------------------ */
    /* Completion                                                          */
    /* ------------------------------------------------------------------ */

    @Transactional
    public void completeInterview(Campaign campaign, UUID registrationId) {
        StudentRegistration reg = locked(registrationId, campaign.getId());
        stateMachine.assertTransition(reg.getStatus(), QueueStatus.COMPLETED);
        reg.setStatus(QueueStatus.COMPLETED);
        reg.setCompletedAt(Instant.now());
        Station previous = reg.getStation();
        reg.setStation(null);
        registrationRepository.save(reg);

        if (previous != null) {
            refreshStationAvailability(previous);
        }

        audit.record(campaign.getId(), "REGISTRATION", reg.getId().toString(), "COMPLETED", Map.of());
        publishQueue(campaign.getId());
        notifications.notifyCompleted(reg);
    }

    /* ------------------------------------------------------------------ */
    /* Voluntary withdrawal                                                */
    /* ------------------------------------------------------------------ */

    @Transactional
    public void withdraw(Campaign campaign, UUID registrationId) {
        StudentRegistration reg = locked(registrationId, campaign.getId());
        if (reg.getStatus() == QueueStatus.COMPLETED || reg.getStatus() == QueueStatus.WITHDRAWN
                || reg.getStatus() == QueueStatus.EXPIRED) {
            throw ApiException.conflict("INVALID_TRANSITION", "Cannot withdraw from " + reg.getStatus());
        }
        reg.setStatus(QueueStatus.WITHDRAWN);
        reg.setWithdrawnAt(Instant.now());
        Station previous = reg.getStation();
        reg.setStation(null);
        registrationRepository.save(reg);

        if (previous != null) {
            refreshStationAvailability(previous);
        }

        audit.record(campaign.getId(), "REGISTRATION", reg.getId().toString(), "WITHDRAWN", Map.of());
        publishQueue(campaign.getId());
    }

    /* ------------------------------------------------------------------ */
    /* Station configuration                                               */
    /* ------------------------------------------------------------------ */

    @Transactional
    public void setStationFiliere(Campaign campaign, UUID stationId, String filiere) {
        Station station = station(campaign.getId(), stationId);
        station.setFiliere(normalize(filiere));
        stationRepository.save(station);
        audit.record(campaign.getId(), "STATION", station.getId().toString(), "FILIERE_CHANGED",
                Map.of("filiere", filiere == null ? "" : filiere));
        publishStation(campaign.getId(), stationId);
    }

    @Transactional
    public void pauseStation(Campaign campaign, UUID stationId) {
        Station station = station(campaign.getId(), stationId);
        station.setStatus(StationStatus.PAUSED);
        stationRepository.save(station);
        audit.record(campaign.getId(), "STATION", station.getId().toString(), "PAUSED", Map.of());
        publishStation(campaign.getId(), stationId);
    }

    @Transactional
    public void resumeStation(Campaign campaign, UUID stationId) {
        Station station = station(campaign.getId(), stationId);
        refreshStationAvailability(station);
        audit.record(campaign.getId(), "STATION", station.getId().toString(), "RESUMED", Map.of());
        publishStation(campaign.getId(), stationId);
    }

    /* ------------------------------------------------------------------ */
    /* Pre-alert (next three eligible)                                     */
    /* ------------------------------------------------------------------ */

    @Transactional
    public List<StudentRegistration> preAlertTopThree(Campaign campaign) {
        List<StudentRegistration> next = registrationRepository
                .findByCampaignAndStatusInOrderBySequence(campaign.getId(), List.copyOf(AVAILABLE))
                .stream().limit(3).toList();

        for (StudentRegistration reg : next) {
            if (reg.getStatus() == QueueStatus.WAITING) {
                reg.setStatus(QueueStatus.APPROACHING);
                registrationRepository.save(reg);
                notifications.notifyPreAlert(reg);
            }
        }
        if (!next.isEmpty()) {
            publishQueue(campaign.getId());
        }
        return next;
    }

    /* ------------------------------------------------------------------ */
    /* Helpers                                                             */
    /* ------------------------------------------------------------------ */

    @Transactional(readOnly = true)
    public Map<String, Long> counts(Campaign campaign) {
        Map<String, Long> counts = new HashMap<>();
        for (QueueStatus s : QueueStatus.values()) {
            counts.put(s.name(), registrationRepository.countByCampaignIdAndStatusIn(campaign.getId(), List.of(s)));
        }
        counts.put("TOTAL", registrationRepository.countByCampaignId(campaign.getId()));
        return counts;
    }

    private StudentRegistration locked(UUID registrationId, UUID campaignId) {
        StudentRegistration reg = registrationRepository.findByIdForUpdate(registrationId)
                .orElseThrow(() -> ApiException.notFound("REGISTRATION_NOT_FOUND", "Registration not found"));
        if (!reg.getCampaign().getId().equals(campaignId)) {
            throw ApiException.forbidden("CROSS_CAMPAIGN", "Registration does not belong to this campaign");
        }
        return reg;
    }

    private Station station(UUID campaignId, UUID stationId) {
        Station station = stationRepository.findById(stationId)
                .orElseThrow(() -> ApiException.notFound("STATION_NOT_FOUND", "Station not found"));
        if (!station.getCampaign().getId().equals(campaignId)) {
            throw ApiException.forbidden("CROSS_CAMPAIGN", "Station does not belong to this campaign");
        }
        return station;
    }

    private void refreshStationAvailability(Station station) {
        List<StudentRegistration> active = registrationRepository.findByCampaignAndStatusInOrderBySequence(
                station.getCampaign().getId(),
                List.of(QueueStatus.CALLED, QueueStatus.DISPATCH_READY, QueueStatus.IN_INTERVIEW));
        boolean busy = active.stream().anyMatch(r ->
                r.getStation() != null && r.getStation().getId().equals(station.getId()));
        station.setStatus(busy ? StationStatus.OCCUPIED : StationStatus.AVAILABLE);
        stationRepository.save(station);
        publishStation(station.getCampaign().getId(), station.getId());
    }

    private void publishQueue(UUID campaignId) {
        realtime.publishToCampaign(campaignId, "QUEUE_UPDATED", Map.of());
    }

    private void publishStation(UUID campaignId, UUID stationId) {
        realtime.publishToCampaign(campaignId, "STATION_UPDATED", Map.of("stationId", stationId.toString()));
    }

    private static String normalize(String value) {
        return value == null ? null : value.trim();
    }
}
