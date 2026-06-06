package com.verita.userservice.exception;

/** Thrown when a refresh token is missing, not found in the database, or has expired. */
public class InvalidRefreshTokenException extends RuntimeException {
    public InvalidRefreshTokenException() {
        super("Refresh token is invalid or has expired");
    }
}
