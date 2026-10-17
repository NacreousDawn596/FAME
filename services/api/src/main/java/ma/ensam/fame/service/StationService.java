package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.Campaign;
import ma.ensam.fame.domain.Recruiter;
import ma.ensam.fame.domain.Station;
import ma.ensam.fame.domain.StationStatus;
import ma.ensam.fame.realtime.RealtimeService;
import ma.ensam.fame.repository.RecruiterRepository;
import ma.ensam.fame.repository.StationRepository;
import ma.ensam.fame.security.FameUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class StationService {

    private final StationRepository stationRepository;
    private final RecruiterRepository recruiterRepository;
    private final CampaignAccessService accessService;
    private final AuditService audit;
    private final RealtimeService realtime;

    public StationService(StationRepository stationRepository,
                          RecruiterRepository recruiterRepository,
                          CampaignAccessService accessService,
                          AuditService audit,
                          RealtimeService realtime) {
        this.stationRepository = stationRepository;
        this.recruiterRepository = recruiterRepository;
        this.accessService = accessService;
        this.audit = audit;
        this.realtime = realtime;
    }

    @Transactional
    public Station create(UUID campaignId, StationRequest req, FameUserPrincipal user) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, user);
        Station station = new Station();
        station.setCampaign(campaign);
        station.setLabel(req.label());
        station.setLocationLabel(req.locationLabel());
        station.setFiliere(req.filiere());
        station.setPosX(req.posX() == null ? 0 : req.posX());
        station.setPosY(req.posY() == null ? 0 : req.posY());
        if (req.recruiterId() != null) {
            station.setRecruiter(recruiter(req.recruiterId()));
        }
        station = stationRepository.save(station);
        audit.record(campaignId, "STATION", station.getId().toString(), "CREATED", Map.of());
        realtime.publishToCampaign(campaignId, "STATION_UPDATED", Map.of("stationId", station.getId().toString()));
        return station;
    }

    @Transactional(readOnly = true)
    public List<Station> list(UUID campaignId, FameUserPrincipal user) {
        accessService.requireCampaignAccess(campaignId, user);
        return stationRepository.findByCampaignIdOrderByLabel(campaignId);
    }

    @Transactional
    public Station update(UUID campaignId, UUID stationId, StationRequest req, FameUserPrincipal user) {
        accessService.requireCampaignAccess(campaignId, user);
        Station station = stationRepository.findById(stationId)
                .orElseThrow(() -> ApiException.notFound("STATION_NOT_FOUND", "Station not found"));
        if (!station.getCampaign().getId().equals(campaignId)) {
            throw ApiException.forbidden("CROSS_CAMPAIGN", "Station does not belong to this campaign");
        }
        if (req.label() != null) station.setLabel(req.label());
        if (req.locationLabel() != null) station.setLocationLabel(req.locationLabel());
        if (req.filiere() != null) station.setFiliere(req.filiere());
        if (req.posX() != null) station.setPosX(req.posX());
        if (req.posY() != null) station.setPosY(req.posY());
        if (req.recruiterId() != null) station.setRecruiter(recruiter(req.recruiterId()));
        station = stationRepository.save(station);
        realtime.publishToCampaign(campaignId, "STATION_UPDATED", Map.of("stationId", station.getId().toString()));
        return station;
    }

    @Transactional
    public void saveLayout(UUID campaignId, List<LayoutPosition> positions, FameUserPrincipal user) {
        accessService.requireCampaignAccess(campaignId, user);
        for (LayoutPosition p : positions) {
            Station station = stationRepository.findById(p.stationId())
                    .orElseThrow(() -> ApiException.notFound("STATION_NOT_FOUND", "Station not found"));
            if (!station.getCampaign().getId().equals(campaignId)) {
                throw ApiException.forbidden("CROSS_CAMPAIGN", "Station does not belong to this campaign");
            }
            station.setPosX(p.posX());
            station.setPosY(p.posY());
            stationRepository.save(station);
        }
        audit.record(campaignId, "ROOM_LAYOUT", campaignId.toString(), "LAYOUT_SAVED",
                Map.of("stations", positions.size()));
        realtime.publishToCampaign(campaignId, "LAYOUT_UPDATED", Map.of());
    }

    @Transactional
    public void delete(UUID campaignId, UUID stationId, FameUserPrincipal user) {
        accessService.requireCampaignAccess(campaignId, user);
        Station station = stationRepository.findById(stationId)
                .orElseThrow(() -> ApiException.notFound("STATION_NOT_FOUND", "Station not found"));
        if (!station.getCampaign().getId().equals(campaignId)) {
            throw ApiException.forbidden("CROSS_CAMPAIGN", "Station does not belong to this campaign");
        }
        stationRepository.delete(station);
        realtime.publishToCampaign(campaignId, "STATION_UPDATED", Map.of("stationId", stationId.toString()));
    }

    private Recruiter recruiter(UUID recruiterId) {
        return recruiterRepository.findById(recruiterId)
                .orElseThrow(() -> ApiException.notFound("RECRUITER_NOT_FOUND", "Recruiter not found"));
    }

    public record StationRequest(String label, String locationLabel, String filiere,
                                 UUID recruiterId, Double posX, Double posY) {
    }

    public record LayoutPosition(UUID stationId, Double posX, Double posY) {
    }
}
