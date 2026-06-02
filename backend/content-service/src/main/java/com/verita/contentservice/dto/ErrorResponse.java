package com.verita.contentservice.dto;
import java.time.OffsetDateTime;
public record ErrorResponse(OffsetDateTime timestamp, int status, String error, String message) {}
