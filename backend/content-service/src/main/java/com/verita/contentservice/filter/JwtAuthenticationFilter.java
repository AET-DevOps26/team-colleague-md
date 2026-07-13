package com.verita.contentservice.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Optional-authentication JWT filter (ADR-0006). Verifies a bearer token with the shared-secret
 * {@link JwtDecoder} (which also requires the {@code userId} claim) and, on success, sets a
 * {@link JwtAuthenticationToken} into the SecurityContext. It is deliberately <strong>fail-open</strong>:
 * an absent or invalid token is ignored and the request continues, so public endpoints serve guests
 * (and personalise when a valid token is present) and authorization rules alone enforce protected ones.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtDecoder jwtDecoder;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            try {
                Jwt jwt = jwtDecoder.decode(header.substring(7));
                SecurityContextHolder.getContext().setAuthentication(
                        new JwtAuthenticationToken(jwt, authorities(jwt)));
            } catch (JwtException e) {
                // Invalid/expired/userId-less token: fail open — drop any auth and continue.
                SecurityContextHolder.clearContext();
            }
        }
        chain.doFilter(request, response);
    }

    /**
     * Maps the token's {@code role} claim (ADR-0001, extended by ADR-0020) to the single
     * {@code ROLE_*} authority the admin routes authorize on. A token minted before the claim
     * existed simply carries no authorities, so it fails admin checks rather than passing them.
     */
    private Collection<GrantedAuthority> authorities(Jwt jwt) {
        String role = jwt.getClaimAsString("role");
        return role == null || role.isBlank()
                ? Collections.emptyList()
                : List.of(new SimpleGrantedAuthority("ROLE_" + role));
    }
}
