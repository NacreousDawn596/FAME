package ma.ensam.fame.web.admin;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import ma.ensam.fame.domain.AppSetting;
import ma.ensam.fame.domain.NotificationTemplate;
import ma.ensam.fame.security.CurrentUser;
import ma.ensam.fame.service.ConfigService;
import ma.ensam.fame.service.ConfigurationFacade;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/configuration")
public class AdminConfigurationController {

    private final ConfigurationFacade facade;
    private final ConfigService configService;

    public AdminConfigurationController(ConfigurationFacade facade, ConfigService configService) {
        this.facade = facade;
        this.configService = configService;
    }

    @GetMapping
    public Map<String, Object> safeConfig() {
        return facade.safeView();
    }

    @GetMapping("/settings")
    public List<Map<String, Object>> settings() {
        return configService.list().stream().map(this::settingView).toList();
    }

    @PutMapping("/settings/{key}")
    public Map<String, Object> putSetting(@PathVariable String key, @Valid @RequestBody SettingRequest body) {
        AppSetting setting = configService.put(key, body.value(), body.description(), CurrentUser.staff().username());
        return settingView(setting);
    }

    private Map<String, Object> settingView(AppSetting s) {
        return Map.of(
                "key", s.getKey(),
                "value", s.getValue(),
                "description", s.getDescription() == null ? "" : s.getDescription(),
                "updatedAt", s.getUpdatedAt().toString(),
                "updatedBy", s.getUpdatedBy() == null ? "" : s.getUpdatedBy());
    }

    public record SettingRequest(@NotBlank String value, String description) {
    }
}
