package com.verita.contentservice.support;
import com.verita.contentservice.dto.ErrorResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;
import java.time.OffsetDateTime;
@RestControllerAdvice
public class ErrorHandling {
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handle(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode().value()).body(new ErrorResponse(OffsetDateTime.now(), ex.getStatusCode().value(), ex.getStatusCode().toString(), ex.getReason() == null ? "error" : ex.getReason()));
    }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleOther(Exception ex) {
        return ResponseEntity.internalServerError().body(new ErrorResponse(OffsetDateTime.now(), 500, "INTERNAL_SERVER_ERROR", ex.getMessage()));
    }
}
