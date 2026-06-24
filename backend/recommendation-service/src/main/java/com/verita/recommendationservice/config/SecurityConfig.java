package com.verita.recommendationservice.config;

import com.verita.recommendationservice.filter.JwtAuthenticationFilter;
import com.verita.recommendationservice.security.SecurityErrorHandler;
import java.nio.charset.StandardCharsets;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, SecurityErrorHandler securityErrorHandler,
                                           JwtAuthenticationFilter jwtAuthenticationFilter) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(securityErrorHandler)
                .accessDeniedHandler(securityErrorHandler)
            )
            .authorizeHttpRequests(auth -> auth
                // Infra endpoints: health probe (docker/k8s), error dispatch, API docs.
                .requestMatchers("/actuator/health", "/error",
                        "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                // spec: security: [] — unauthenticated access permitted
                .requestMatchers(HttpMethod.GET, "/api/v1/feed/trending").permitAll()
                // everything else requires a valid JWT
                .anyRequest().authenticated()
            )
            // Optional authentication (ADR-0006): the fail-open filter authenticates a valid
            // token and ignores an absent/invalid one; the authorization rules above do the
            // enforcing, and protected-endpoint 401s flow through SecurityErrorHandler (JSON).
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Verifies access tokens issued by user-service, which signs them HS256 with a shared
     * symmetric secret. This replaces the previous {@code issuer-uri}/JWKS resource-server
     * configuration, which expected asymmetric OIDC tokens that nothing in the platform issues
     * (issue #150). The shared {@code app.jwt-secret} must match user-service's signing secret.
     */
    @Bean
    public JwtDecoder jwtDecoder(@Value("${app.jwt-secret}") String secret) {
        SecretKeySpec key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        // Reject tokens without the 'userId' claim at authentication time, so identity-less
        // tokens fail cleanly with 401 rather than 500-ing later in SecurityUtils (issue #150).
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                token -> token.getClaimAsString("userId") != null
                        ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(
                                new OAuth2Error("invalid_token", "Missing required 'userId' claim", null))));
        return decoder;
    }
}
