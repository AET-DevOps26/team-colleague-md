package com.verita.userservice.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Handles unauthenticated access by returning HTTP 401 instead of redirecting
 * to a login page (which would be meaningless for a stateless REST API).
 * Registered in {@link SecurityConfig} as the default authentication entry point.
 */
@Slf4j
@Component
public class AuthEntryPointJwt implements AuthenticationEntryPoint {

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException, ServletException {
        // A 401 here is the expected outcome for anonymous visitors hitting a protected
        // endpoint (e.g. an unauthenticated page load probing /auth/refresh with no cookie).
        // Log at debug so normal logged-out traffic does not spam ERROR-level noise.
        log.debug("Unauthorized error: {}", authException.getMessage());
        response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Error: Unauthorized");
    }
}
