package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.QueueStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class QueueStateMachineTest {

    private final QueueStateMachine machine = new QueueStateMachine();

    @Test
    void allowsDocumentedTransitions() {
        assertDoesNotThrow(() -> machine.assertTransition(QueueStatus.WAITING, QueueStatus.CALLED));
        assertDoesNotThrow(() -> machine.assertTransition(QueueStatus.CALLED, QueueStatus.DISPATCH_READY));
        assertDoesNotThrow(() -> machine.assertTransition(QueueStatus.DISPATCH_READY, QueueStatus.IN_INTERVIEW));
        assertDoesNotThrow(() -> machine.assertTransition(QueueStatus.IN_INTERVIEW, QueueStatus.COMPLETED));
        assertDoesNotThrow(() -> machine.assertTransition(QueueStatus.WAITING, QueueStatus.WITHDRAWN));
        assertDoesNotThrow(() -> machine.assertTransition(QueueStatus.ABSENT, QueueStatus.DEFERRED));
    }

    @Test
    void rejectsInvalidTransitions() {
        assertThrows(ApiException.class,
                () -> machine.assertTransition(QueueStatus.COMPLETED, QueueStatus.CALLED));
        assertThrows(ApiException.class,
                () -> machine.assertTransition(QueueStatus.WITHDRAWN, QueueStatus.WAITING));
        assertThrows(ApiException.class,
                () -> machine.assertTransition(QueueStatus.WAITING, QueueStatus.COMPLETED));
        assertThrows(ApiException.class,
                () -> machine.assertTransition(QueueStatus.EXPIRED, QueueStatus.CALLED));
        assertThrows(ApiException.class,
                () -> machine.assertTransition(QueueStatus.IN_INTERVIEW, QueueStatus.ABSENT));
    }

    @Test
    void terminalStatesHaveNoOutgoingTransitions() {
        for (QueueStatus terminal : new QueueStatus[]{QueueStatus.COMPLETED, QueueStatus.WITHDRAWN, QueueStatus.EXPIRED}) {
            for (QueueStatus target : QueueStatus.values()) {
                assertThrows(ApiException.class, () -> machine.assertTransition(terminal, target));
            }
        }
    }
}
