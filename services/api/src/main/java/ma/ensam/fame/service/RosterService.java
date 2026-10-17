package ma.ensam.fame.service;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.Campaign;
import ma.ensam.fame.domain.RosterEntry;
import ma.ensam.fame.repository.RosterEntryRepository;
import ma.ensam.fame.security.FameUserPrincipal;
import ma.ensam.fame.security.SchoolAppAssertionVerifier;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class RosterService {

    private static final Set<String> CODE_HEADERS = Set.of("code", "cne", "masar", "student_code", "studentcode", "identifiant");
    private static final Set<String> EMAIL_HEADERS = Set.of("email", "mail", "courriel");
    private static final Set<String> NAME_HEADERS = Set.of("name", "nom", "full_name", "fullname", "nom_complet");
    private static final Set<String> FILIERE_HEADERS = Set.of("filiere", "program", "programme", "formation", "specialite");

    private final RosterEntryRepository repository;
    private final CampaignAccessService accessService;
    private final AuditService audit;

    public RosterService(RosterEntryRepository repository,
                         CampaignAccessService accessService,
                         AuditService audit) {
        this.repository = repository;
        this.accessService = accessService;
        this.audit = audit;
    }

    @Transactional
    public ImportSummary importCsv(UUID campaignId, MultipartFile file, FameUserPrincipal user) {
        Campaign campaign = accessService.requireCampaignAccess(campaignId, user);
        String batch = UUID.randomUUID().toString();

        List<String[]> rows = parse(file);
        if (rows.isEmpty()) {
            throw ApiException.badRequest("EMPTY_CSV", "CSV file is empty");
        }

        String[] header = rows.get(0);
        ColumnMap columns = mapColumns(header);
        if (columns.code < 0) {
            throw ApiException.badRequest("CSV_HEADER", "CSV must contain a student code column");
        }

        int total = 0, imported = 0, duplicates = 0, errors = 0;
        List<String> errorDetails = new ArrayList<>();
        Set<String> seenInFile = new HashSet<>();

        for (int i = 1; i < rows.size(); i++) {
            total++;
            String[] row = rows.get(i);
            try {
                String code = value(row, columns.code);
                if (code == null || code.isBlank()) {
                    throw new IllegalArgumentException("missing code");
                }
                code = SchoolAppAssertionVerifier.normalizeCode(code);

                if (!seenInFile.add(code)) {
                    duplicates++;
                    errorDetails.add("row " + (i + 1) + ": duplicate code in file");
                    continue;
                }

                RosterEntry entry = repository.findByCampaignIdAndStudentCode(campaignId, code)
                        .orElseGet(RosterEntry::new);
                entry.setCampaign(campaign);
                entry.setStudentCode(code);
                entry.setEmail(value(row, columns.email));
                entry.setFullName(value(row, columns.name));
                entry.setFiliere(value(row, columns.filiere));
                entry.setImportBatch(batch);
                repository.save(entry);
                imported++;
            } catch (Exception e) {
                errors++;
                errorDetails.add("row " + (i + 1) + ": " + e.getMessage());
            }
        }

        audit.record(campaignId, "ROSTER", batch, "IMPORTED",
                Map.of("imported", imported, "duplicates", duplicates, "errors", errors));

        return new ImportSummary(total, imported, duplicates, errors, errorDetails, batch);
    }

    @Transactional(readOnly = true)
    public List<RosterEntry> list(UUID campaignId, FameUserPrincipal user) {
        accessService.requireCampaignAccess(campaignId, user);
        return repository.findByCampaignId(campaignId);
    }

    @Transactional
    public void delete(UUID campaignId, FameUserPrincipal user) {
        accessService.requireCampaignAccess(campaignId, user);
        repository.deleteByCampaignId(campaignId);
        audit.record(campaignId, "ROSTER", campaignId.toString(), "CLEARED", Map.of());
    }

    /* ------------------------------------------------------------------ */

    private List<String[]> parse(MultipartFile file) {
        try (InputStream in = new BufferedInputStream(file.getInputStream());
             Reader reader = new InputStreamReader(in, StandardCharsets.UTF_8);
             CSVParser parser = CSVFormat.DEFAULT.builder()
                     .setTrim(true)
                     .setIgnoreEmptyLines(true)
                     .build()
                     .parse(reader)) {

            List<String[]> rows = new ArrayList<>();
            for (CSVRecord record : parser) {
                String[] values = new String[record.size()];
                for (int i = 0; i < record.size(); i++) {
                    values[i] = record.get(i);
                }
                rows.add(values);
            }
            return rows;
        } catch (IOException e) {
            throw ApiException.badRequest("CSV_READ", "Could not read CSV file");
        }
    }

    private ColumnMap mapColumns(String[] header) {
        ColumnMap map = new ColumnMap(-1, -1, -1, -1);
        for (int i = 0; i < header.length; i++) {
            String h = header[i] == null ? "" : header[i].trim().toLowerCase().replace("\uFEFF", "");
            if (CODE_HEADERS.contains(h)) map.code = i;
            else if (EMAIL_HEADERS.contains(h)) map.email = i;
            else if (NAME_HEADERS.contains(h)) map.name = i;
            else if (FILIERE_HEADERS.contains(h)) map.filiere = i;
        }
        return map;
    }

    private String value(String[] row, int idx) {
        if (idx < 0 || idx >= row.length) return null;
        String v = row[idx];
        return (v == null || v.isBlank()) ? null : v.trim();
    }

    private static final class ColumnMap {
        int code, email, name, filiere;
        ColumnMap(int code, int email, int name, int filiere) {
            this.code = code; this.email = email; this.name = name; this.filiere = filiere;
        }
    }

    public record ImportSummary(int total, int imported, int duplicates, int errors,
                                List<String> errorDetails, String batchId) {
    }
}
