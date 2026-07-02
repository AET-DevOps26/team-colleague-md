package com.verita.userservice.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Central Spring Security configuration for the User Service.
 * Wires together the JWT filter, authentication provider, password encoder,
 * CORS policy, and per-endpoint access rules.
 *
 * <p>Allowed origins are controlled via the {@code CORS_ALLOWED_ORIGINS} environment
 * variable (defaults to {@code http://localhost:3000} for local development).
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final UserDetailsServiceImpl userDetailsService;
    private final AuthEntryPointJwt unauthorizedHandler;
    private final JwtUtils jwtUtils;

    @Value("${app.corsAllowedOrigins}")
    private String corsAllowedOrigins;

    public SecurityConfig(UserDetailsServiceImpl userDetailsService,
                             AuthEntryPointJwt unauthorizedHandler,
                             JwtUtils jwtUtils) {
        this.userDetailsService = userDetailsService;
        this.unauthorizedHandler = unauthorizedHandler;
        this.jwtUtils = jwtUtils;
    }

    @Bean
    public AuthTokenFilter authenticationJwtTokenFilter() {
        return new AuthTokenFilter(jwtUtils, userDetailsService);
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Builds the CORS configuration from the comma-separated {@code app.corsAllowedOrigins} property.
     * Supports multiple origins for staging and production environments.
     *
     * @return a {@link CorsConfigurationSource} applied to all routes
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(corsAllowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /**
     * Defines the security filter chain:
     * <ul>
     *   <li>Stateless JWT authentication (no HTTP session)</li>
     *   <li>Public: all {@code /api/v1/auth/**} endpoints and {@code /actuator/health}</li>
     *   <li>{@code GET /api/v1/users/me} requires authentication (must precede the wildcards below)</li>
     *   <li>{@code GET /api/v1/users/by-username/*} is publicly readable (lookup by username)</li>
     *   <li>{@code GET /api/v1/users/*} is publicly readable (lookup by UUID)</li>
     *   <li>Admin-only: user management and role endpoints</li>
     *   <li>All other requests require authentication</li>
     * </ul>
     */
    /**
     * Dedicated chain for the actuator endpoints (health, info, prometheus). Ordered ahead of
     * the application chain so Prometheus can scrape {@code /actuator/prometheus} without a JWT.
     * The endpoints are not publicly reachable: the nginx gateway denies {@code /user/actuator}
     * and the backend Service is ClusterIP-only.
     */
    @Bean
    @Order(0)
    public SecurityFilterChain actuatorSecurityFilterChain(HttpSecurity http) throws Exception {
        http.securityMatcher("/actuator/**")
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .csrf(csrf -> csrf.disable());
        return http.build();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .exceptionHandling(exception -> exception.authenticationEntryPoint(unauthorizedHandler))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth ->
                auth.requestMatchers("/api/v1/auth/**").permitAll()
                    .requestMatchers("/actuator/health").permitAll()
                    // Service-only endpoints: permitAll at the user-auth layer; authenticated as a
                    // service by INTERNAL_SERVICE_TOKEN in InternalAuthFilter, not a user token (ADR-0007).
                    .requestMatchers("/internal/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/v1/users/me").authenticated()
                    .requestMatchers(HttpMethod.GET, "/api/v1/users/by-username/*").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/v1/users/*").permitAll()
                    .requestMatchers("/api/v1/users").hasRole("ADMIN")
                    .requestMatchers("/api/v1/users/*/role").hasRole("ADMIN")
                    .requestMatchers("/api/v1/users/*/verification-status").hasRole("ADMIN")
                    .anyRequest().authenticated()
            );

        http.authenticationProvider(authenticationProvider());
        http.addFilterBefore(authenticationJwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
