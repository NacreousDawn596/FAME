package ma.ensam.fame.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.ensam.fame.domain.StudentRegistration;
import ma.ensam.fame.repository.StudentRegistrationRepository;
import ma.ensam.fame.security.FameUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ExportService {

    private final StudentRegistrationRepository registrationRepository;
    private final CampaignAccessService accessService;
    private final AnalyticsService analyticsService;
    private final ObjectMapper objectMapper;

    public ExportService(StudentRegistrationRepository registrationRepository,
                         CampaignAccessService accessService,
                         AnalyticsService analyticsService,
                         ObjectMapper objectMapper) {
        this.registrationRepository = registrationRepository;
        this.accessService = accessService;
        this.analyticsService = analyticsService;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public String exportRegistrations(UUID campaignId, FameUserPrincipal user, String format) {
        accessService.requireCampaignAccess(campaignId, user);
        List<StudentRegistration> registrations =
                registrationRepository.findByCampaignIdOrderBySequenceNoAsc(campaignId);

        if ("json".equalsIgnoreCase(format)) {
            try {
                return objectMapper.writeValueAsString(registrations.stream()
                        .map(this::toMap).toList());
            } catch (Exception e) {
                throw new RuntimeException("Failed to serialize export", e);
            }
        }

        StringBuilder sb = new StringBuilder();
        sb.append("sequenceNo,studentCode,fullName,filiere,status,arrivalAt,calledAt,interviewStartedAt,completedAt\n");
        for (StudentRegistration r : registrations) {
            sb.append(r.getSequenceNo()).append(',')
              .append(csvCell(r.getStudentCode())).append(',')
              .append(csvCell(r.getFullName())).append(',')
              .append(csvCell(r.getFiliere())).append(',')
              .append(r.getStatus().name()).append(',')
              .append(csvCell(r.getArrivalAt() == null ? "" : r.getArrivalAt().toString())).append(',')
              .append(csvCell(r.getCalledAt() == null ? "" : r.getCalledAt().toString())).append(',')
              .append(csvCell(r.getInterviewStartedAt() == null ? "" : r.getInterviewStartedAt().toString())).append(',')
              .append(csvCell(r.getCompletedAt() == null ? "" : r.getCompletedAt().toString())).append('\n');
        }
        return sb.toString();
    }

    @Transactional(readOnly = true)
    public String exportAnalytics(UUID campaignId, FameUserPrincipal user, String format) {
        AnalyticsService.AnalyticsResult result = analyticsService.analyze(campaignId, user);
        try {
            return "json".equalsIgnoreCase(format)
                    ? objectMapper.writeValueAsString(result)
                    : objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(result);
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize analytics", e);
        }
    }

    private Map<String, Object> toMap(StudentRegistration r) {
        return Map.of(
                "sequenceNo", r.getSequenceNo(),
                "studentCode", r.getStudentCode(),
                "fullName", r.getFullName() == null ? "" : r.getFullName(),
                "filiere", r.getFiliere() == null ? "" : r.getFiliere(),
                "status", r.getStatus().name(),
                "arrivalAt", r.getArrivalAt() == null ? "" : r.getArrivalAt().toString(),
                "calledAt", r.getCalledAt() == null ? "" : r.getCalledAt().toString(),
                "completedAt", r.getCompletedAt() == null ? "" : r.getCompletedAt().toString());
    }

    /** Mitigates CSV formula injection by neutralizing leading formula characters. */
    private static String csvCell(String value) {
        if (value == null) return "";
        String v = value;
        if (v.startsWith("=") || v.startsWith("+") || v.startsWith("-") || v.startsWith("@")
                || v.startsWith("\t") || v.startsWith("\r")) {
            v = "'" + v;
        }
        if (v.contains(",") || v.contains("\"") || v.contains("\n")) {
            v = "\"" + v.replace("\"", "\"\"") + "\"";
        }
        return v;
    }
}
