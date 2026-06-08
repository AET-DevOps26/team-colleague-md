package com.verita.contentservice.support;

import com.verita.model.ErrorResponse;
import java.time.OffsetDateTime;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ErrorHandling {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode().value()).body(new ErrorResponse()
                .timestamp(OffsetDateTime.now())
                .status(ex.getStatusCode().value())
                .error(ex.getStatusCode().toString())
                .message(ex.getReason() == null ? "error" : ex.getReason()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleOther(Exception ex) {
        return ResponseEntity.internalServerError().body(new ErrorResponse()
                .timestamp(OffsetDateTime.now())
                .status(500)
                .error("INTERNAL_SERVER_ERROR")
                .message(ex.getMessage()));
    }
}
