package com.verita.recommendationservice.security;

import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class SecurityUtilsTest {

    private final SecurityUtils securityUtils = new SecurityUtils();

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateWithUserId(String userIdClaim) {
        Jwt.Builder builder = Jwt.withTokenValue("token").header("alg", "HS256").subject("alice");
        if (userIdClaim != null) {
            builder.claim("userId", userIdClaim);
        }
        SecurityContextHolder.getContext().setAuthentication(
                new JwtAuthenticationToken(builder.build()));
    }

    @Test
    void getCurrentUserId_returnsUserIdClaim() {
        UUID id = UUID.randomUUID();
        authenticateWithUserId(id.toString());
        assertEquals(id, securityUtils.getCurrentUserId());
    }

    @Test
    void getCurrentUserIdOptional_present_whenAuthenticated() {
        UUID id = UUID.randomUUID();
        authenticateWithUserId(id.toString());
        assertEquals(id, securityUtils.getCurrentUserIdOptional().orElseThrow());
    }

    @Test
    void getCurrentUserIdOptional_empty_whenAnonymous() {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("anon", null));
        assertTrue(securityUtils.getCurrentUserIdOptional().isEmpty());
    }

    @Test
    void getCurrentUserId_throws_whenNoJwtAuthentication() {
        assertThrows(IllegalStateException.class, securityUtils::getCurrentUserId);
    }

    @Test
    void getCurrentUserId_throws_whenUserIdClaimMissing() {
        authenticateWithUserId(null);
        assertThrows(IllegalStateException.class, securityUtils::getCurrentUserId);
    }
}
