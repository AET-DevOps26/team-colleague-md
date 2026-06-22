package com.verita.userservice.controller;

import com.verita.model.ErrorResponse;
import com.verita.userservice.exception.DuplicateEmailException;
import com.verita.userservice.exception.DuplicateUsernameException;
import com.verita.userservice.exception.DeleteUserRecommendationException;
import com.verita.userservice.exception.InvalidAvatarException;
import com.verita.userservice.exception.InvalidRefreshTokenException;
import com.verita.userservice.exception.UserNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Direct unit tests for the centralized exception-to-HTTP mapping. Mirrors the content-service
 * ErrorHandlingTest so both services verify their advice the same way.
 */
public class GlobalExceptionHandlerTests {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void duplicateUsername_mapsTo409() {
        ResponseEntity<ErrorResponse> response =
                handler.handleDuplicateUsername(new DuplicateUsernameException("alice"));

        assertEquals(409, response.getStatusCode().value());
        assertEquals(409, response.getBody().getStatus());
    }

    @Test
    void duplicateEmail_mapsTo409() {
        ResponseEntity<ErrorResponse> response =
                handler.handleDuplicateEmail(new DuplicateEmailException("alice@example.com"));

        assertEquals(409, response.getStatusCode().value());
    }

    @Test
    void userNotFound_mapsTo401WithGenericMessage() {
        // Returns 401 (not 404) with a generic message to avoid leaking which accounts exist.
        ResponseEntity<ErrorResponse> response =
                handler.handleUserNotFound(new UserNotFoundException("alice@example.com"));

        assertEquals(401, response.getStatusCode().value());
        assertEquals("Invalid credentials", response.getBody().getMessage());
    }

    @Test
    void invalidRefreshToken_mapsTo401() {
        ResponseEntity<ErrorResponse> response =
                handler.handleInvalidRefreshToken(new InvalidRefreshTokenException());

        assertEquals(401, response.getStatusCode().value());
    }

    @Test
    void invalidAvatar_mapsTo400WithMessage() {
        ResponseEntity<ErrorResponse> response =
                handler.handleInvalidAvatar(new InvalidAvatarException("Avatar file must be JPEG or PNG."));

        assertEquals(400, response.getStatusCode().value());
        assertEquals("Avatar file must be JPEG or PNG.", response.getBody().getMessage());
    }

    @Test
    void deleteUserRecommendation_mapsTo503() {
        DeleteUserRecommendationException exception = new DeleteUserRecommendationException(
                UUID.randomUUID(),
                "recommendation-service",
                "/internal/v1/users/{userId}/data",
                503,
                "cleanup unavailable",
                new RuntimeException("cleanup unavailable"));

        ResponseEntity<ErrorResponse> response = handler.handleDeleteUserRecommendation(exception);

        assertEquals(503, response.getStatusCode().value());
        assertEquals(503, response.getBody().getStatus());
        assertEquals(exception.getMessage(), response.getBody().getMessage());
    }

    @Test
    void missingAvatarPart_mapsTo400WithAvatarMessage() {
        ResponseEntity<ErrorResponse> response =
                handler.handleMissingRequestPart(new MissingServletRequestPartException("avatar"));

        assertEquals(400, response.getStatusCode().value());
        assertEquals("Avatar file is required.", response.getBody().getMessage());
    }
}
