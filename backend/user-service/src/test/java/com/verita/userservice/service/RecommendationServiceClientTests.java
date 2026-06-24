package com.verita.userservice.service;

import com.sun.net.httpserver.HttpServer;
import com.verita.userservice.exception.DeleteUserRecommendationException;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RecommendationServiceClientTests {

    @Test
    void deleteUserRecommendationData_whenRecommendationServiceReturnsError_wrapsResponseMetadata()
            throws IOException {
        UUID userId = UUID.randomUUID();
        AtomicReference<String> authorization = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/internal/v1/users/" + userId + "/data", exchange -> {
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] body = "cleanup failed".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(502, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();

        try {
            RecommendationServiceClient client =
                    new RecommendationServiceClient("http://localhost:" + server.getAddress().getPort());

            DeleteUserRecommendationException ex = assertThrows(DeleteUserRecommendationException.class,
                    () -> client.deleteUserRecommendationData(userId, "Bearer token"));

            assertEquals("Bearer token", authorization.get());
            assertEquals(userId, ex.getUserId());
            assertEquals("recommendation-service", ex.getDownstreamService());
            assertEquals("/internal/v1/users/{userId}/data", ex.getEndpoint());
            assertEquals(502, ex.getDownstreamStatus());
            assertEquals("cleanup failed", ex.getDownstreamResponseBody());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void deleteUserRecommendationData_whenClientFails_wrapsUnavailableMetadata() {
        UUID userId = UUID.randomUUID();
        RecommendationServiceClient client = new RecommendationServiceClient("http://localhost:9");

        DeleteUserRecommendationException ex = assertThrows(DeleteUserRecommendationException.class,
                () -> client.deleteUserRecommendationData(userId, null));

        assertEquals(userId, ex.getUserId());
        assertEquals("recommendation-service", ex.getDownstreamService());
        assertEquals("/internal/v1/users/{userId}/data", ex.getEndpoint());
        assertNull(ex.getDownstreamStatus());
        assertNull(ex.getDownstreamResponseBody());
    }
}
