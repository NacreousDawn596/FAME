package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.QueueStatus;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

/**
 * Explicit candidate state machine. Only documented transitions are allowed.
 *
 * States:
 *   WAITING         — in queue, eligible for selection.
 *   APPROACHING     — pre-alerted (one of next three), heading to pre-wait area.
 *   CALLED          — officially called by a regulator.
 *   DISPATCH_READY  — in the preparation buffer ("sas"), physically ready.
 *   IN_INTERVIEW    — dispatched to a station, interview in progress.
 *   ABSENT          — no-show; may be rescheduled to DEFERRED.
 *   DEFERRED        — rescheduled after an absence (rejoins the queue).
 *   COMPLETED       — interview finished (terminal).
 *   WITHDRAWN       — voluntarily left the queue (terminal).
 *   EXPIRED         — campaign closed before interview (terminal).
 */
@Component
public class QueueStateMachine {

    private static final Map<QueueStatus, Set<QueueStatus>> ALLOWED = Map.of(
            QueueStatus.WAITING, EnumSet.of(
                    QueueStatus.APPROACHING, QueueStatus.CALLED,
                    QueueStatus.WITHDRAWN, QueueStatus.EXPIRED),
            QueueStatus.APPROACHING, EnumSet.of(
                    QueueStatus.WAITING, QueueStatus.CALLED,
                    QueueStatus.WITHDRAWN, QueueStatus.EXPIRED),
            QueueStatus.CALLED, EnumSet.of(
                    QueueStatus.DISPATCH_READY, QueueStatus.IN_INTERVIEW,
                    QueueStatus.ABSENT, QueueStatus.WITHDRAWN, QueueStatus.EXPIRED),
            QueueStatus.DISPATCH_READY, EnumSet.of(
                    QueueStatus.IN_INTERVIEW, QueueStatus.ABSENT, QueueStatus.EXPIRED),
            QueueStatus.IN_INTERVIEW, EnumSet.of(QueueStatus.COMPLETED),
            QueueStatus.ABSENT, EnumSet.of(QueueStatus.DEFERRED, QueueStatus.EXPIRED),
            QueueStatus.DEFERRED, EnumSet.of(
                    QueueStatus.APPROACHING, QueueStatus.CALLED,
                    QueueStatus.WITHDRAWN, QueueStatus.EXPIRED),
            QueueStatus.COMPLETED, EnumSet.noneOf(QueueStatus.class),
            QueueStatus.WITHDRAWN, EnumSet.noneOf(QueueStatus.class),
            QueueStatus.EXPIRED, EnumSet.noneOf(QueueStatus.class)
    );

    public void assertTransition(QueueStatus from, QueueStatus to) {
        Set<QueueStatus> allowed = ALLOWED.get(from);
        if (allowed == null || !allowed.contains(to)) {
            throw ApiException.conflict("INVALID_TRANSITION",
                    "Cannot transition from " + from + " to " + to);
        }
    }

    /** States considered available/eligible for FIFO selection. */
    public static final Set<QueueStatus> AVAILABLE = EnumSet.of(QueueStatus.WAITING, QueueStatus.APPROACHING);
}
