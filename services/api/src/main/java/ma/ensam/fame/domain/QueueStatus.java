package ma.ensam.fame.domain;

/**
 * Candidate state machine. Allowed transitions are enforced in
 * {@link ma.ensam.fame.service.QueueStateMachine}.
 */
public enum QueueStatus {
    WAITING,
    APPROACHING,
    CALLED,
    DISPATCH_READY,
    IN_INTERVIEW,
    ABSENT,
    DEFERRED,
    COMPLETED,
    WITHDRAWN,
    EXPIRED
}
