package ma.ensam.fame.service;

import ma.ensam.fame.domain.Campaign;
import ma.ensam.fame.domain.CampaignStatus;
import ma.ensam.fame.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Data-management helpers: entity record counts and campaign archival.
 */
@Service
public class AdminDataService {

    private final CampaignRepository campaignRepository;
    private final StudentRegistrationRepository registrationRepository;
    private final StationRepository stationRepository;
    private final RosterEntryRepository rosterRepository;
    private final QueueEventRepository eventRepository;
    private final BroadcastRepository broadcastRepository;
    private final AppUserRepository userRepository;
    private final NotificationTemplateRepository templateRepository;
    private final AppSettingRepository settingRepository;

    public AdminDataService(CampaignRepository campaignRepository,
                            StudentRegistrationRepository registrationRepository,
                            StationRepository stationRepository,
                            RosterEntryRepository rosterRepository,
                            QueueEventRepository eventRepository,
                            BroadcastRepository broadcastRepository,
                            AppUserRepository userRepository,
                            NotificationTemplateRepository templateRepository,
                            AppSettingRepository settingRepository) {
        this.campaignRepository = campaignRepository;
        this.registrationRepository = registrationRepository;
        this.stationRepository = stationRepository;
        this.rosterRepository = rosterRepository;
        this.eventRepository = eventRepository;
        this.broadcastRepository = broadcastRepository;
        this.userRepository = userRepository;
        this.templateRepository = templateRepository;
        this.settingRepository = settingRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Long> entityCounts() {
        Map<String, Long> counts = new LinkedHashMap<>();
        counts.put("campaigns", campaignRepository.count());
        counts.put("registrations", registrationRepository.count());
        counts.put("stations", stationRepository.count());
        counts.put("rosterEntries", rosterRepository.count());
        counts.put("auditEvents", eventRepository.count());
        counts.put("broadcasts", broadcastRepository.count());
        counts.put("users", userRepository.count());
        counts.put("templates", templateRepository.count());
        counts.put("settings", settingRepository.count());
        return counts;
    }

    @Transactional
    public int archiveClosedCampaigns(String actor) {
        List<Campaign> closed = campaignRepository.findByStatusOrderByCreatedAtDesc(CampaignStatus.CLOSED);
        for (Campaign c : closed) {
            c.setStatus(CampaignStatus.ARCHIVED);
            campaignRepository.save(c);
        }
        return closed.size();
    }
}
