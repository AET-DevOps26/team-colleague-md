package com.verita.userservice.client;

import com.sun.net.httpserver.HttpServer;
import com.verita.userservice.exception.DeleteUserContentException;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ContentServiceClientTests {

    @Test
    void deleteUserContentData_whenContentServiceReturnsError_wrapsResponseMetadata() throws IOException {
        UUID userId = UUID.randomUUID();
        AtomicReference<String> internalToken = new AtomicReference<>();
        AtomicReference<String> authorization = new AtomicReference<>();
        HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/internal/v1/users/" + userId + "/data", exchange -> {
            internalToken.set(exchange.getRequestHeaders()
                    .getFirst(ContentServiceClient.INTERNAL_TOKEN_HEADER));
            authorization.set(exchange.getRequestHeaders().getFirst("Authorization"));
            byte[] body = "cleanup failed".getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(502, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();

        try {
            ContentServiceClient client =
                    new ContentServiceClient("http://localhost:" + server.getAddress().getPort(), "test-token");

            DeleteUserContentException ex = assertThrows(DeleteUserContentException.class,
                    () -> client.deleteUserContentData(userId));

            // Authenticates as a service via the internal token, never forwarding a user JWT.
            assertEquals("test-token", internalToken.get());
            assertNull(authorization.get());
            assertEquals(userId, ex.getUserId());
            assertEquals("content-service", ex.getDownstreamService());
            assertEquals("/internal/v1/users/{userId}/data", ex.getEndpoint());
            assertEquals(502, ex.getDownstreamStatus());
            assertEquals("cleanup failed", ex.getDownstreamResponseBody());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void deleteUserContentData_whenClientFails_wrapsUnavailableMetadata() {
        UUID userId = UUID.randomUUID();
        ContentServiceClient client = new ContentServiceClient("http://localhost:9", "test-token");

        DeleteUserContentException ex = assertThrows(DeleteUserContentException.class,
                () -> client.deleteUserContentData(userId));

        assertEquals(userId, ex.getUserId());
        assertEquals("content-service", ex.getDownstreamService());
        assertEquals("/internal/v1/users/{userId}/data", ex.getEndpoint());
        assertNull(ex.getDownstreamStatus());
        assertNull(ex.getDownstreamResponseBody());
    }
}
