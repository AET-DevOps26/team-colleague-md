package com.verita.recommendationservice.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class SecurityUtils {

    public UUID getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (!(auth instanceof JwtAuthenticationToken jwtAuth)) {
            throw new IllegalStateException("Expected JWT authentication but got: " +
                    (auth == null ? "null" : auth.getClass().getSimpleName()));
        }
        String subject = jwtAuth.getToken().getSubject();
        if (subject == null) {
            throw new IllegalStateException("JWT is missing required 'sub' claim");
        }
        try {
            return UUID.fromString(subject);
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("JWT 'sub' claim is not a valid UUID: " + subject, e);
        }
    }
}
