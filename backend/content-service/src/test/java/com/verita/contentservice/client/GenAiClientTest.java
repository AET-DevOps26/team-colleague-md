package com.verita.contentservice.client;

import static org.junit.jupiter.api.Assertions.assertThrows;

import com.sun.net.httpserver.HttpServer;
import com.verita.contentservice.exception.InvalidGenAiOutputException;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

class GenAiClientTest {

    @Test
    void summarize_mapsInvalidLlmOutputToNonRetryableException() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/api/v1/genai/summarize", exchange -> {
            byte[] body = """
                    {"detail":{"error":"invalid_llm_output","message":"Unusable prose"}}
                    """.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(422, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();

        try {
            GenAiClient client = new GenAiClient(
                    "http://localhost:" + server.getAddress().getPort(), "test-token", 60);

            assertThrows(InvalidGenAiOutputException.class,
                    () -> client.summarize(UUID.randomUUID(), "Title", "Body"));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void summarizeDoesNotMatchInvalidOutputTextOutsideErrorCode() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/api/v1/genai/summarize", exchange -> {
            byte[] body = """
                    {"detail":{"error":"validation_error","message":"invalid_llm_output"}}
                    """.getBytes(StandardCharsets.UTF_8);
            exchange.sendResponseHeaders(422, body.length);
            exchange.getResponseBody().write(body);
            exchange.close();
        });
        server.start();

        try {
            GenAiClient client = new GenAiClient(
                    "http://localhost:" + server.getAddress().getPort(), "test-token", 60);

            assertThrows(RestClientResponseException.class,
                    () -> client.summarize(UUID.randomUUID(), "Title", "Body"));
        } finally {
            server.stop(0);
        }
    }

    @Test
    void summarizeUsesConfiguredReadTimeout() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress("localhost", 0), 0);
        server.createContext("/api/v1/genai/summarize", exchange -> {
            try {
                Thread.sleep(1500);
                byte[] body = """
                        {"postId":"00000000-0000-0000-0000-000000000000","summary":[],"model":"test"}
                        """.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, body.length);
                exchange.getResponseBody().write(body);
                exchange.close();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        });
        server.start();

        try {
            GenAiClient client = new GenAiClient(
                    "http://localhost:" + server.getAddress().getPort(), "test-token", 1);

            assertThrows(RestClientException.class,
                    () -> client.summarize(UUID.randomUUID(), "Title", "Body"));
        } finally {
            server.stop(0);
        }
    }

}
