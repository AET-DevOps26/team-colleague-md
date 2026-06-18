package com.verita.userservice.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Unit tests for the JWT signing/validation utility. Security-critical and previously only
 * exercised indirectly through the auth flow. The {@code @Value} fields are injected with
 * {@link ReflectionTestUtils}, mirroring the AvatarStorageServiceTests setup.
 */
public class JwtUtilsTests {

    // 64-byte secret: HS256 requires at least a 256-bit key.
    private static final String SECRET = "0123456789012345678901234567890123456789012345678901234567890123";

    private JwtUtils jwtUtils;
    private Authentication authentication;

    @BeforeEach
    void setUp() {
        jwtUtils = new JwtUtils();
        ReflectionTestUtils.setField(jwtUtils, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(jwtUtils, "jwtExpirationMs", 60000);
        ReflectionTestUtils.setField(jwtUtils, "jwtRefreshExpirationMs", 604800000L);

        UserDetailsImpl principal = new UserDetailsImpl(
                UUID.randomUUID(), "alice", "alice@example.com", "hashed", List.of());
        authentication = new UsernamePasswordAuthenticationToken(principal, null, List.of());
    }

    @Test
    void generateThenValidate_roundTripsUsername() {
        String token = jwtUtils.generateJwtToken(authentication);

        assertTrue(jwtUtils.validateJwtToken(token));
        assertEquals("alice", jwtUtils.getUserNameFromJwtToken(token));
    }

    @Test
    void validateJwtToken_malformedToken_returnsFalse() {
        assertFalse(jwtUtils.validateJwtToken("not-a-real-jwt"));
    }

    @Test
    void validateJwtToken_emptyToken_returnsFalse() {
        assertFalse(jwtUtils.validateJwtToken(""));
    }

    @Test
    void validateJwtToken_expiredToken_returnsFalse() {
        ReflectionTestUtils.setField(jwtUtils, "jwtExpirationMs", -1000); // already expired when issued
        String expired = jwtUtils.generateJwtToken(authentication);

        assertFalse(jwtUtils.validateJwtToken(expired));
    }

    @Test
    void expirationGetters_returnConfiguredValues() {
        assertEquals(60000, jwtUtils.getExpirationMs());
        assertEquals(604800000L, jwtUtils.getRefreshExpirationMs());
    }
}
