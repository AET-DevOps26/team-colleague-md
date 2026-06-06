package com.verita.userservice.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.nio.charset.StandardCharsets;

/**
 * Utility component for creating and validating JWTs used as access tokens.
 * Encapsulates the signing key, expiry configuration, and all token operations
 * so no other class needs to depend on the JJWT library directly.
 */
@Slf4j
@Component
public class JwtUtils {

    @Value("${app.jwtSecret}")
    private String jwtSecret;

    @Value("${app.jwtExpirationMs}")
    private int jwtExpirationMs;

    @Value("${app.jwtRefreshExpirationMs}")
    private long jwtRefreshExpirationMs;

    /**
     * Generates a signed JWT for an authenticated principal.
     * The token subject is the username; expiry is set from {@code app.jwtExpirationMs}.
     *
     * @param authentication the authenticated principal returned by the AuthenticationManager
     * @return a compact, URL-safe JWT string
     */
    public String generateJwtToken(Authentication authentication) {
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();

        return Jwts.builder()
                .setSubject(userPrincipal.getUsername())
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /**
     * Extracts the username (subject claim) from a validated JWT string.
     *
     * @param token a valid, non-expired JWT
     * @return the username stored in the subject claim
     */
    public String getUserNameFromJwtToken(String token) {
        return Jwts.parserBuilder().setSigningKey(getSigningKey()).build()
                .parseClaimsJws(token).getBody().getSubject();
    }

    /**
     * Returns the configured token lifetime in milliseconds.
     * Used by {@link com.verita.userservice.service.AuthService} to populate
     * {@code AuthResponse.expiresIn} (converted to seconds).
     *
     * @return token expiration duration in milliseconds
     */
    public int getExpirationMs() {
        return jwtExpirationMs;
    }

    /**
     * Returns the configured refresh token lifetime in milliseconds.
     *
     * @return refresh token expiration duration in milliseconds
     */
    public long getRefreshExpirationMs() {
        return jwtRefreshExpirationMs;
    }

    /**
     * Validates a JWT string against the signing key.
     * Logs a descriptive error and returns {@code false} for any validation failure
     * rather than propagating an exception, so the filter chain can continue.
     *
     * @param authToken the raw JWT string to validate
     * @return {@code true} if the token is well-formed, correctly signed, and not expired
     */
    public boolean validateJwtToken(String authToken) {
        try {
            Jwts.parserBuilder().setSigningKey(getSigningKey()).build().parseClaimsJws(authToken);
            return true;
        } catch (MalformedJwtException e) {
            log.error("Invalid JWT token: {}", e.getMessage());
        } catch (ExpiredJwtException e) {
            log.error("JWT token is expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.error("JWT token is unsupported: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.error("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes(StandardCharsets.UTF_8));
    }
}
