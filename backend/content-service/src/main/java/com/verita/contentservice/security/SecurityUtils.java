package com.verita.contentservice.security;

import java.util.Optional;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

/**
 * Reads the authenticated caller's identity from the SecurityContext (ADR-0006). Identity lives in
 * the verified {@code userId} claim; {@code sub} remains the username. Never resolves identity via
 * user-service {@code /users/me}.
 */
@Component
public class SecurityUtils {

    /** The caller's UUID; throws when the request is not authenticated (protected endpoints). */
    public UUID getCurrentUserId() {
        return getCurrentUserIdOptional()
                .orElseThrow(() -> new IllegalStateException("No authenticated user in the security context"));
    }

    /**
     * The caller's UUID for personalised public endpoints (ADR-0006): present when a valid token
     * authenticated the request, empty for anonymous callers. Never throws.
     */
    public Optional<UUID> getCurrentUserIdOptional() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
            return Optional.empty();
        }
        String userId = jwtAuth.getToken().getClaimAsString("userId");
        if (userId == null) {
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString(userId));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    /**
     * The raw bearer token of the authenticated caller, for forwarding on outbound calls
     * (ADR-0002), e.g. the async genai summary request. Empty for anonymous callers.
     */
    public Optional<String> getCurrentTokenValue() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
            return Optional.empty();
        }
        return Optional.ofNullable(jwtAuth.getToken().getTokenValue());
    }
}
