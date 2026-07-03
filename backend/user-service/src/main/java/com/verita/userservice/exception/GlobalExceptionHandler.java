package com.verita.userservice.exception;

import com.verita.model.ErrorResponse;
import com.verita.userservice.exception.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import java.time.OffsetDateTime;

/**
 * Centralized exception handler for all controllers. Translates domain exceptions
 * into structured {@link com.verita.model.ErrorResponse} HTTP responses so callers
 * receive consistent error payloads regardless of which controller threw.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(DuplicateUsernameException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateUsername(DuplicateUsernameException ex) {
        return errorResponse(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(DuplicateEmailException.class)
    public ResponseEntity<ErrorResponse> handleDuplicateEmail(DuplicateEmailException ex) {
        return errorResponse(HttpStatus.CONFLICT, ex.getMessage());
    }

    @ExceptionHandler(UserNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleUserNotFound(UserNotFoundException ex) {
        // Return 401 rather than 404 to avoid revealing whether an account exists.
        return errorResponse(HttpStatus.UNAUTHORIZED, "Invalid credentials");
    }

    @ExceptionHandler(InvalidRefreshTokenException.class)
    public ResponseEntity<ErrorResponse> handleInvalidRefreshToken(InvalidRefreshTokenException ex) {
        return errorResponse(HttpStatus.UNAUTHORIZED, ex.getMessage());
    }

    @ExceptionHandler(InvalidAvatarException.class)
    public ResponseEntity<ErrorResponse> handleInvalidAvatar(InvalidAvatarException ex) {
        return errorResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(InvalidPasswordResetException.class)
    public ResponseEntity<ErrorResponse> handleInvalidPasswordReset(InvalidPasswordResetException ex) {
        // Generic 400 — the message intentionally does not reveal which check failed.
        return errorResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(DeleteUserContentException.class)
    public ResponseEntity<ErrorResponse> handleDeleteUserContent(DeleteUserContentException ex) {
        log.warn(
                "Failed to clean up user content data: userId={}, service={}, endpoint={}, downstreamStatus={}, downstreamBody={}",
                ex.getUserId(),
                ex.getDownstreamService(),
                ex.getEndpoint(),
                ex.getDownstreamStatus(),
                ex.getDownstreamResponseBody(),
                ex
        );
        return errorResponse(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
    }

    @ExceptionHandler(DeleteUserRecommendationException.class)
    public ResponseEntity<ErrorResponse> handleDeleteUserRecommendation(DeleteUserRecommendationException ex) {
        log.warn(
                "Failed to clean up user recommendation data: userId={}, service={}, endpoint={}, downstreamStatus={}, downstreamBody={}",
                ex.getUserId(),
                ex.getDownstreamService(),
                ex.getEndpoint(),
                ex.getDownstreamStatus(),
                ex.getDownstreamResponseBody(),
                ex
        );
        return errorResponse(HttpStatus.SERVICE_UNAVAILABLE, ex.getMessage());
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ErrorResponse> handleMissingRequestPart(MissingServletRequestPartException ex) {
        if ("avatar".equals(ex.getRequestPartName())) {
            return errorResponse(HttpStatus.BAD_REQUEST, "Avatar file is required.");
        }
        return errorResponse(HttpStatus.BAD_REQUEST, "Required request part is missing.");
    }

    private ResponseEntity<ErrorResponse> errorResponse(HttpStatus status, String message) {
        ErrorResponse body = new ErrorResponse();
        body.setTimestamp(OffsetDateTime.now());
        body.setStatus(status.value());
        body.setMessage(message);
        return ResponseEntity.status(status).body(body);
    }
}
