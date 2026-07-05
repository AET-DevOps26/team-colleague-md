package com.verita.contentservice.config;

import com.verita.contentservice.filter.JwtAuthenticationFilter;
import com.verita.contentservice.security.SecurityErrorHandler;
import java.nio.charset.StandardCharsets;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /**
     * Dedicated chain for the actuator endpoints (health, info, prometheus). Ordered ahead of
     * the application chain so Prometheus can scrape {@code /actuator/prometheus} without a JWT.
     * The endpoints are not publicly reachable: the nginx gateway denies {@code /content/actuator}
     * and the backend Service is ClusterIP-only.
     */
    @Bean
    @Order(0)
    SecurityFilterChain actuatorSecurityFilterChain(HttpSecurity http) throws Exception {
        http.securityMatcher("/actuator/**")
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .csrf(AbstractHttpConfigurer::disable);
        return http.build();
    }

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http, SecurityErrorHandler securityErrorHandler,
                                    JwtAuthenticationFilter jwtAuthenticationFilter,
                                    CorsConfigurationSource corsConfigurationSource) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(securityErrorHandler)
                .accessDeniedHandler(securityErrorHandler))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health", "/error",
                        "/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                // Digest history is personal (ADR-0019): fail closed. Must precede the public
                // digest reads below so it is not swallowed by them.
                .requestMatchers(HttpMethod.GET, "/api/v1/digests").authenticated()
                // Public reads — guests browse; a valid token additionally personalises (ADR-0006).
                .requestMatchers(HttpMethod.GET,
                        "/api/v1/digests/public/today",
                        "/api/v1/digests/{id}",
                        "/api/v1/posts",
                        "/api/v1/posts/cards",
                        "/api/v1/posts/search",
                        "/api/v1/posts/{id}",
                        "/api/v1/posts/{id}/comments",
                        "/api/v1/users/{id}/posts",
                        "/api/v1/users/{id}/bookmarks",
                        "/api/v1/users/{id}/likes",
                        "/api/v1/topics",
                        "/api/v1/topics/search",
                        "/api/v1/topics/trending").permitAll()
                // Service-only endpoints: permitAll at the user-auth layer; authenticated as a
                // service by INTERNAL_SERVICE_TOKEN in InternalAuthFilter, not a user token (ADR-0007).
                .requestMatchers("/internal/**").permitAll()
                .anyRequest().authenticated())
            // Optional authentication (ADR-0006): fail-open filter; authorization rules enforce.
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") String allowedOrigins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Verifies access tokens issued by user-service (HS256, shared {@code app.jwt-secret}) and
     * requires the {@code userId} claim so identity-less tokens fail validation (ADR-0001, ADR-0006).
     */
    @Bean
    JwtDecoder jwtDecoder(@Value("${app.jwt-secret}") String secret) {
        SecretKeySpec key = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefault(),
                token -> token.getClaimAsString("userId") != null
                        ? OAuth2TokenValidatorResult.success()
                        : OAuth2TokenValidatorResult.failure(
                                new OAuth2Error("invalid_token", "Missing required 'userId' claim", null))));
        return decoder;
    }
}
