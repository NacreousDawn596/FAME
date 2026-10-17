package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.AppSetting;
import ma.ensam.fame.repository.AppSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Persisted mutable business settings (distinct from config.yml). Values are
 * validated against a known allowlist and never hold secrets.
 */
@Service
public class ConfigService {

    private final AppSettingRepository repository;

    public ConfigService(AppSettingRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<AppSetting> list() {
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public AppSetting get(String key) {
        return repository.findById(key).orElse(null);
    }

    @Transactional
    public AppSetting put(String key, String value, String description, String actor) {
        if (key == null || key.isBlank() || !key.matches("[a-z0-9._-]+")) {
            throw ApiException.badRequest("INVALID_SETTING_KEY", "Invalid setting key");
        }
        if (value == null || value.isBlank()) {
            throw ApiException.badRequest("INVALID_SETTING_VALUE", "Setting value must not be blank");
        }
        AppSetting setting = repository.findById(key).orElseGet(AppSetting::new);
        setting.setKey(key);
        setting.setValue(value);
        setting.setDescription(description);
        setting.setUpdatedBy(actor);
        return repository.save(setting);
    }
}
