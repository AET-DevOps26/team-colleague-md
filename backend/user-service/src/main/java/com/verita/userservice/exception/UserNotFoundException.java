package com.verita.userservice.exception;

/** Thrown when a user lookup by email or username finds no matching account. */
public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(String identifier) {
        super("User not found: " + identifier);
    }
}
