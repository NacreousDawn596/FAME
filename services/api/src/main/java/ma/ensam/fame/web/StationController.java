package ma.ensam.fame.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import ma.ensam.fame.domain.Station;
import ma.ensam.fame.security.CurrentUser;
import ma.ensam.fame.service.StationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/campaigns/{campaignId}/stations")
public class StationController {

    private final StationService stationService;

    public StationController(StationService stationService) {
        this.stationService = stationService;
    }

    @GetMapping
    public List<Map<String, Object>> list(@PathVariable UUID campaignId) {
        return stationService.list(campaignId, CurrentUser.staff()).stream().map(Views::station).toList();
    }

    @PostMapping
    public Map<String, Object> create(@PathVariable UUID campaignId,
                                      @Valid @RequestBody StationService.StationRequest body) {
        Station s = stationService.create(campaignId, body, CurrentUser.staff());
        return Views.station(s);
    }

    @PutMapping("/{stationId}")
    public Map<String, Object> update(@PathVariable UUID campaignId, @PathVariable UUID stationId,
                                      @RequestBody StationService.StationRequest body) {
        Station s = stationService.update(campaignId, stationId, body, CurrentUser.staff());
        return Views.station(s);
    }

    @DeleteMapping("/{stationId}")
    public Map<String, Object> delete(@PathVariable UUID campaignId, @PathVariable UUID stationId) {
        stationService.delete(campaignId, stationId, CurrentUser.staff());
        return Map.of("ok", true);
    }

    /** Persist the 2D room layout (station positions) in one call. */
    @PutMapping("/layout")
    public Map<String, Object> saveLayout(@PathVariable UUID campaignId,
                                          @RequestBody List<StationService.LayoutPosition> positions) {
        stationService.saveLayout(campaignId, positions, CurrentUser.staff());
        return Map.of("ok", true, "count", positions.size());
    }

    public record CreateRequest(@NotBlank String label) {
    }
}
