package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.AppSetting;
import ma.ensam.fame.repository.AppSettingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ConfigServiceTest {

    private AppSettingRepository repository;
    private ConfigService service;

    @BeforeEach
    void setUp() {
        repository = mock(AppSettingRepository.class);
        service = new ConfigService(repository);
    }

    @Test
    void acceptsValidKeyAndValue() {
        when(repository.save(any(AppSetting.class))).thenAnswer(i -> i.getArgument(0));
        AppSetting setting = service.put("notification.prealert.count", "3", "desc", "admin");
        assertEquals("notification.prealert.count", setting.getKey());
        assertEquals("3", setting.getValue());
    }

    @Test
    void rejectsInvalidKey() {
        assertThrows(ApiException.class, () -> service.put("BAD KEY!", "x", null, "admin"));
    }

    @Test
    void rejectsBlankValue() {
        assertThrows(ApiException.class, () -> service.put("valid.key", "  ", null, "admin"));
    }
}
