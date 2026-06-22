package com.verita.contentservice.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Gates service-only endpoints with the shared {@code INTERNAL_SERVICE_TOKEN} (ADR-0007). These
 * endpoints are {@code permitAll} for user auth; this filter authenticates the calling <em>service</em>
 * via the {@code X-Internal-Service-Token} header and 403s anyone else.
 */
@Component
public class InternalAuthFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-Internal-Service-Token";
    private static final Set<String> INTERNAL_POST_PATHS = Set.of(
            "/api/v1/topics/follower-counts",
            "/api/v1/posts/digest");

    private final String internalServiceToken;

    public InternalAuthFilter(@Value("${app.internal-service-token}") String internalServiceToken) {
        this.internalServiceToken = internalServiceToken;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        if (HttpMethod.POST.matches(request.getMethod()) && INTERNAL_POST_PATHS.contains(request.getRequestURI())) {
            String provided = request.getHeader(HEADER);
            if (provided == null || !provided.equals(internalServiceToken)) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Internal callers only");
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
