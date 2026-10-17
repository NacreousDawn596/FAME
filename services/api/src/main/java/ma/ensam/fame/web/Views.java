package ma.ensam.fame.web;

import ma.ensam.fame.domain.*;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Serialization views. Never exposes password hashes, versions, or internal
 * relations; only the fields each client role is authorized to see.
 */
public final class Views {

    private Views() {
    }

    public static Map<String, Object> company(Company c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId().toString());
        m.put("name", c.getName());
        m.put("description", c.getDescription());
        m.put("logoUrl", c.getLogoUrl());
        return m;
    }

    public static Map<String, Object> recruiter(Recruiter r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId().toString());
        m.put("fullName", r.getFullName());
        m.put("email", r.getEmail());
        m.put("title", r.getTitle());
        m.put("photoUrl", r.getPhotoUrl());
        return m;
    }

    public static Map<String, Object> campaign(Campaign c) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", c.getId().toString());
        m.put("name", c.getName());
        m.put("description", c.getDescription());
        m.put("location", c.getLocation());
        m.put("status", c.getStatus().name());
        m.put("startsAt", c.getStartsAt());
        m.put("endsAt", c.getEndsAt());
        m.put("publicDisplayEnabled", c.isPublicDisplayEnabled());
        m.put("companyId", c.getCompany().getId().toString());
        m.put("companyName", c.getCompany().getName());
        return m;
    }

    public static Map<String, Object> station(Station s) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", s.getId().toString());
        m.put("label", s.getLabel());
        m.put("locationLabel", s.getLocationLabel());
        m.put("filiere", s.getFiliere());
        m.put("status", s.getStatus().name());
        m.put("posX", s.getPosX());
        m.put("posY", s.getPosY());
        if (s.getRecruiter() != null) {
            m.put("recruiter", recruiter(s.getRecruiter()));
        }
        return m;
    }

    public static Map<String, Object> registration(StudentRegistration r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", r.getId().toString());
        m.put("studentCode", r.getStudentCode());
        m.put("fullName", r.getFullName());
        m.put("filiere", r.getFiliere());
        m.put("status", r.getStatus().name());
        m.put("sequenceNo", r.getSequenceNo());
        m.put("arrivalAt", r.getArrivalAt());
        m.put("calledAt", r.getCalledAt());
        m.put("registeredAt", r.getRegisteredAt());
        if (r.getStation() != null) {
            m.put("station", station(r.getStation()));
        }
        return m;
    }

    /** Minimal public view — no email, code, or private fields. */
    public static Map<String, Object> publicCandidate(StudentRegistration r, String mode) {
        Map<String, Object> m = new LinkedHashMap<>();
        String label;
        if ("CODE".equalsIgnoreCase(mode)) {
            label = r.getStudentCode();
        } else {
            // Default: first name only (never full name, contact, or code).
            String full = r.getFullName() == null ? "" : r.getFullName().trim();
            label = full.isEmpty() ? "—" : full.split("\\s+")[0];
        }
        m.put("label", label);
        m.put("status", r.getStatus().name());
        m.put("filiere", r.getFiliere());
        return m;
    }
}
