package com.verita.userservice.controller;

import com.verita.model.ErrorResponse;
import com.verita.userservice.exception.*;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {

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

    private ResponseEntity<ErrorResponse> errorResponse(HttpStatus status, String message) {
        ErrorResponse body = new ErrorResponse();
        body.setTimestamp(OffsetDateTime.now());
        body.setStatus(status.value());
        body.setMessage(message);
        return ResponseEntity.status(status).body(body);
    }
}
