package com.verita.userservice.exception;

/**
 * Thrown when a password-reset code or token is missing, wrong, expired, or has exhausted its
 * verification attempts. Mapped to 400 with a deliberately generic message so callers cannot
 * distinguish the specific failure (anti-enumeration / anti-bruteforce).
 */
public class InvalidPasswordResetException extends RuntimeException {

    public InvalidPasswordResetException() {
        super("Invalid or expired reset code");
    }
}
