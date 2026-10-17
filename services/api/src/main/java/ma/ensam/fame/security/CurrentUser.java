package ma.ensam.fame.security;

import ma.ensam.fame.common.ApiException;
import ma.ensam.fame.domain.Role;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

public final class CurrentUser {

    private CurrentUser() {
    }

    public static Authentication authentication() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    public static boolean isStaff() {
        Authentication a = authentication();
        return a != null && a.getPrincipal() instanceof FameUserPrincipal;
    }

    public static FameUserPrincipal staff() {
        Authentication a = authentication();
        if (a == null || !(a.getPrincipal() instanceof FameUserPrincipal p)) {
            throw ApiException.unauthorized("NOT_AUTHENTICATED", "Staff authentication required");
        }
        return p;
    }

    public static boolean isAdmin() {
        return isStaff() && (staff().role() == Role.ADMIN || staff().role() == Role.SUPERADMIN);
    }

    public static boolean isSuperAdmin() {
        return isStaff() && staff().role() == Role.SUPERADMIN;
    }

    public static StudentPrincipal student() {
        Authentication a = authentication();
        if (a == null || !(a.getPrincipal() instanceof StudentPrincipal p)) {
            throw ApiException.unauthorized("NOT_AUTHENTICATED", "Student authentication required");
        }
        return p;
    }

    public static UUID staffIdOrNull() {
        Authentication a = authentication();
        if (a != null && a.getPrincipal() instanceof FameUserPrincipal p) {
            return p.id();
        }
        return null;
    }
}
