package com.verita.recommendationservice.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component
public class SecurityUtils {

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

    public UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
            throw new IllegalStateException("Expected JWT authentication but got: " +
                    (auth == null ? "null" : auth.getClass().getSimpleName()));
        }
        // Identity travels in the 'userId' claim (a UUID); 'sub' is the username (ADR-0001).
        String userId = jwtAuth.getToken().getClaimAsString("userId");
        if (userId == null) {
            throw new IllegalStateException("JWT is missing required 'userId' claim");
        }
        try {
            return UUID.fromString(userId);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("JWT 'userId' claim is not a valid UUID: " + userId, e);
        }
    }
}
