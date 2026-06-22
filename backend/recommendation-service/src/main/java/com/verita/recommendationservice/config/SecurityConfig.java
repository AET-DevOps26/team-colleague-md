package com.verita.recommendationservice.config;

import com.verita.recommendationservice.security.SecurityErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /**
     * Dedicated chain for the actuator endpoints (health, info, prometheus). Ordered ahead
     * of the application chain so Prometheus can scrape {@code /actuator/prometheus} without a
     * JWT. The endpoints are not publicly reachable: the nginx gateway denies
     * {@code /recommendation/actuator} and the backend Service is ClusterIP-only.
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
    public SecurityFilterChain filterChain(HttpSecurity http, SecurityErrorHandler securityErrorHandler) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(securityErrorHandler)
                .accessDeniedHandler(securityErrorHandler)
            )
            .authorizeHttpRequests(auth -> auth
                // spec: security: [] — unauthenticated access permitted
                .requestMatchers(HttpMethod.GET, "/api/v1/feed/trending").permitAll()
                // everything else requires a valid JWT
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));

        return http.build();
    }
}
