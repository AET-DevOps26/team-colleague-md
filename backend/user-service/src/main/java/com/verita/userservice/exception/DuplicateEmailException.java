package com.verita.userservice.exception;

/** Thrown during registration when the requested email address is already registered. */
public class DuplicateEmailException extends RuntimeException {
    public DuplicateEmailException(String email) {
        super("Email already in use: " + email);
    }
}
