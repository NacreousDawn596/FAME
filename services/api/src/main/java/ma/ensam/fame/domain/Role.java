package ma.ensam.fame.domain;

public enum Role {
    /** Platform superadmin — full control over the control center. */
    SUPERADMIN,
    /** Platform administrator / delegated campaign manager. */
    ADMIN,
    ORGANIZER,
    /** Recruiter account (email + password, DB-backed). */
    RECRUITER
}
