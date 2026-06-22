package com.verita.recommendationservice.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.openapitools.jackson.nullable.JsonNullableModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {

    /**
     * Spring Boot 4 auto-configures a Jackson 3 ({@code tools.jackson}) mapper, but the
     * OpenAPI-generated models, {@code jackson-databind-nullable}, and the hand-written
     * components ({@code InteractionMapper}, {@code SecurityErrorHandler}) are all built on
     * Jackson 2 ({@code com.fasterxml.jackson}). This provides the Jackson 2 ObjectMapper
     * bean they inject, with JSR-310 (java.time) support and the JsonNullable module that the
     * generated nullable fields require.
     */
    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.findAndRegisterModules();          // registers jackson-datatype-jsr310, etc.
        mapper.registerModule(new JsonNullableModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return mapper;
    }
}
