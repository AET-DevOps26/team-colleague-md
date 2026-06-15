package com.verita.userservice.exception;

/** Thrown during registration when the requested username is already taken. */
public class DuplicateUsernameException extends RuntimeException {
    public DuplicateUsernameException(String username) {
        super("Username already taken: " + username);
    }
}
