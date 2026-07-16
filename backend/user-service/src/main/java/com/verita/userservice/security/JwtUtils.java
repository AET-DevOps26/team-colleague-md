package com.verita.userservice.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
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

    @Value("${app.jwt-secret}")
    private String jwtSecret;

    @Value("${app.jwt-expiration-ms}")
    private int jwtExpirationMs;

    @Value("${app.jwt-refresh-expiration-ms}")
    private long jwtRefreshExpirationMs;

    /**
     * Generates a signed JWT for an authenticated principal.
     * The token subject is the username; the user's UUID is carried in a {@code userId}
     * claim so consumer services can identify the caller without a lookup, and the user's role
     * in a {@code role} claim so consumer services can authorize admin-only routes without a
     * lookup either (ADR-0001, extended by ADR-0020). Expiry is set from
     * {@code app.jwt-expiration-ms}.
     *
     * <p>The role is a snapshot: a role change only reaches consumer services when the caller's
     * next access token is minted (login or refresh, which rebuilds the principal from the DB).
     *
     * @param authentication the authenticated principal returned by the AuthenticationManager
     * @return a compact, URL-safe JWT string
     */
    public String generateJwtToken(Authentication authentication) {
        UserDetailsImpl userPrincipal = (UserDetailsImpl) authentication.getPrincipal();

        return Jwts.builder()
                .setSubject(userPrincipal.getUsername())
                .claim("userId", userPrincipal.getId().toString())
                .claim("role", extractRole(userPrincipal))
                .setIssuedAt(new Date())
                .setExpiration(new Date((new Date()).getTime() + jwtExpirationMs))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    /** Unwraps the principal's single {@code ROLE_*} authority back to the bare role name. */
    private String extractRole(UserDetailsImpl principal) {
        return principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.substring("ROLE_".length()))
                .findFirst()
                .orElse("USER");
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
     * Extracts the user's UUID from the {@code userId} claim of a validated JWT string.
     * This is the canonical caller identity consumer services rely on.
     *
     * @param token a valid, non-expired JWT
     * @return the user UUID stored in the {@code userId} claim
     */
    public String getUserIdFromJwtToken(String token) {
        return Jwts.parserBuilder().setSigningKey(getSigningKey()).build()
                .parseClaimsJws(token).getBody().get("userId", String.class);
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
