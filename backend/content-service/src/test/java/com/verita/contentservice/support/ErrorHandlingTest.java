package com.verita.contentservice.support;

import com.verita.model.ErrorResponse;
import jakarta.validation.ConstraintViolationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Collections;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

public class ErrorHandlingTest {

    private ErrorHandling errorHandling;

    @BeforeEach
    void setUp() {
        errorHandling = new ErrorHandling();
    }

    @Test
    void responseStatusException_preservesStatusAndReason() {
        ResponseEntity<ErrorResponse> response =
                errorHandling.handle(new ResponseStatusException(HttpStatus.NOT_FOUND, "post not found"));

        assertEquals(404, response.getStatusCode().value());
        assertEquals(404, response.getBody().getStatus());
        assertEquals("post not found", response.getBody().getMessage());
    }

    @Test
    void responseStatusException_withoutReason_fallsBackToError() {
        ResponseEntity<ErrorResponse> response =
                errorHandling.handle(new ResponseStatusException(HttpStatus.FORBIDDEN));

        assertEquals(403, response.getStatusCode().value());
        assertEquals("error", response.getBody().getMessage());
    }

    @Test
    void methodArgumentNotValid_returnsBadRequestWithFieldMessages() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors())
                .thenReturn(List.of(new FieldError("postRequest", "title", "must not be blank")));

        ResponseEntity<ErrorResponse> response = errorHandling.handleValidation(ex);

        assertEquals(400, response.getStatusCode().value());
        assertEquals("BAD_REQUEST", response.getBody().getError());
        assertTrue(response.getBody().getMessage().contains("title: must not be blank"));
    }

    @Test
    void constraintViolation_returnsBadRequest() {
        ResponseEntity<ErrorResponse> response =
                errorHandling.handleConstraintViolation(new ConstraintViolationException(Collections.emptySet()));

        assertEquals(400, response.getStatusCode().value());
    }

    @Test
    void illegalArgument_returnsBadRequestWithMessage() {
        ResponseEntity<ErrorResponse> response =
                errorHandling.handleIllegalArgument(new IllegalArgumentException("delta must be +1 or -1"));

        assertEquals(400, response.getStatusCode().value());
        assertEquals("delta must be +1 or -1", response.getBody().getMessage());
    }

    @Test
    void unhandledException_returnsInternalServerError() {
        ResponseEntity<ErrorResponse> response = errorHandling.handleOther(new RuntimeException("boom"));

        assertEquals(500, response.getStatusCode().value());
        assertEquals("INTERNAL_SERVER_ERROR", response.getBody().getError());
    }
}
