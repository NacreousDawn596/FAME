package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.*;
import ma.ensam.fame.repository.*;
import ma.ensam.fame.realtime.RealtimeService;
import ma.ensam.fame.security.FameUserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NotificationCommandServiceTest {

    private NotificationTemplateRepository templateRepository;
    private BroadcastRepository broadcastRepository;
    private BroadcastRecipientRepository recipientRepository;
    private StudentRegistrationRepository registrationRepository;
    private CampaignAccessService accessService;
    private NotificationCommandService service;

    private final FameUserPrincipal actor =
            new FameUserPrincipal(UUID.randomUUID(), "superadmin@ensam-umi.ac.ma", "SA", Role.SUPERADMIN);

    @BeforeEach
    void setUp() {
        templateRepository = mock(NotificationTemplateRepository.class);
        broadcastRepository = mock(BroadcastRepository.class);
        recipientRepository = mock(BroadcastRecipientRepository.class);
        registrationRepository = mock(StudentRegistrationRepository.class);
        accessService = mock(CampaignAccessService.class);
        RealtimeService realtime = mock(RealtimeService.class);
        AuditService audit = mock(AuditService.class);
        service = new NotificationCommandService(templateRepository, broadcastRepository,
                recipientRepository, registrationRepository, accessService, realtime, audit);
    }

    @Test
    void rejectsDuplicateTemplateName() {
        when(templateRepository.findByName("welcome")).thenReturn(Optional.of(new NotificationTemplate()));
        assertThrows(ApiException.class,
                () -> service.createTemplate("welcome", "t", "b", "TYPE", "/student"));
    }

    @Test
    void rejectsEmptyTargetAudience() {
        when(registrationRepository.findByCampaignAndStatusInOrderBySequence(any(), any()))
                .thenReturn(List.of());
        assertThrows(ApiException.class, () ->
                service.compose("WAITING", UUID.randomUUID(), null, "title", "body", "ANNOUNCEMENT", "/student", actor));
    }

    @Test
    void previewResolvesRecipientCount() {
        StudentRegistration r1 = new StudentRegistration();
        r1.setId(UUID.randomUUID());
        when(registrationRepository.findByCampaignAndStatusInOrderBySequence(any(), any()))
                .thenReturn(List.of(r1, r1));
        var preview = service.preview("WAITING", UUID.randomUUID(), null);
        assertEquals(2, preview.count());
    }

    @Test
    void unknownSegmentIsRejected() {
        assertThrows(ApiException.class, () -> service.preview("NOPE", UUID.randomUUID(), null));
    }

    @Test
    void composeCreatesRecipientsAndBroadcast() {
        StudentRegistration r1 = new StudentRegistration();
        r1.setId(UUID.randomUUID());
        Campaign campaign = new Campaign();
        campaign.setId(UUID.randomUUID());
        r1.setCampaign(campaign);
        when(registrationRepository.findByCampaignAndStatusInOrderBySequence(any(), any()))
                .thenReturn(List.of(r1));
        when(broadcastRepository.save(any(Broadcast.class))).thenAnswer(i -> {
            Broadcast b = i.getArgument(0);
            b.setId(UUID.randomUUID());
            return b;
        });

        Broadcast broadcast = service.compose("WAITING", campaign.getId(), null,
                "title", "body", "ANNOUNCEMENT", "/student", actor);

        assertEquals(Broadcast.Status.SENDING, broadcast.getStatus());
        assertEquals(1, broadcast.getTargetCount());
        verify(recipientRepository).save(any(BroadcastRecipient.class));
    }
}
