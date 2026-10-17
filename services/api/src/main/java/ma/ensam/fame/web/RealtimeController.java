package ma.ensam.fame.web;

import ma.ensam.fame.realtime.SseEmitterRegistry;
import ma.ensam.fame.security.CurrentUser;
import ma.ensam.fame.security.StudentPrincipal;
import ma.ensam.fame.service.CampaignAccessService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/realtime")
public class RealtimeController {

    private final SseEmitterRegistry registry;
    private final CampaignAccessService accessService;

    public RealtimeController(SseEmitterRegistry registry, CampaignAccessService accessService) {
        this.registry = registry;
        this.accessService = accessService;
    }

    /** Staff stream for a campaign channel (requires campaign authorization). */
    @GetMapping(value = "/campaign/{campaignId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter campaignStream(@PathVariable UUID campaignId) {
        var user = CurrentUser.staff();
        accessService.requireCampaignAccess(campaignId, user);
        return registry.register("fame:campaign:" + campaignId);
    }

    /** Student stream: only the student's own events, never the global queue. */
    @GetMapping(value = "/student/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter studentStream() {
        StudentPrincipal student = CurrentUser.student();
        return registry.register("fame:student:" + student.registrationId());
    }
}
