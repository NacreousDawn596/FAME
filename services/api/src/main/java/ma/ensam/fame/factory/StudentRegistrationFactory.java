package ma.ensam.fame.factory;

import ma.ensam.fame.domain.Campaign;
import ma.ensam.fame.domain.QueueStatus;
import ma.ensam.fame.domain.StudentRegistration;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Builds {@link StudentRegistration} instances. Centralizes the initial
 * WAITING state and authoritative timestamps so the queue engine only
 * orchestrates ordering and persistence.
 */
@Component
public class StudentRegistrationFactory implements Factory<StudentRegistration, StudentRegistrationFactory.Context> {

    public record Context(
            Campaign campaign,
            String studentCode,
            String email,
            String fullName,
            String filiere,
            boolean recovery,
            long sequenceNo,
            Instant arrivalAt) {
    }

    @Override
    public StudentRegistration create(Context ctx) {
        StudentRegistration reg = new StudentRegistration();
        reg.setCampaign(ctx.campaign());
        reg.setStudentCode(ctx.studentCode());
        reg.setEmail(ctx.email());
        reg.setFullName(ctx.fullName());
        reg.setFiliere(ctx.filiere());
        reg.setSequenceNo(ctx.sequenceNo());
        reg.setArrivalAt(ctx.arrivalAt());
        reg.setStatus(QueueStatus.WAITING);
        reg.setRecoveryAccount(ctx.recovery());
        reg.setRegisteredAt(ctx.arrivalAt());
        return reg;
    }
}
