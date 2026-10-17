package ma.ensam.fame.domain;

public enum Role {
    /** Platform superadmin — granted only after SchoolApp-verified email matches config. */
    SUPERADMIN,
    /** Platform administrator / delegated campaign manager. */
    ADMIN,
    ORGANIZER
}
