package com.verita.userservice.controller;

import com.verita.api.AuthenticationApi;
import com.verita.model.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.beans.factory.annotation.Autowired;
import com.verita.userservice.service.AuthService;

@RestController
public class AuthController implements AuthenticationApi {

    @Autowired
    private AuthService authService;

    /**
     * POST /auth/forgot-password : Request password reset
     *
     * @param forgotPasswordRequest (required)
     * @return Password reset email sent. (status code 204)
     * or Invalid request. (status code 400)
     * or Not Found. (status code 404)
     */
    @Override
    public ResponseEntity<Void> forgotPassword(ForgotPasswordRequest forgotPasswordRequest) {
        return ResponseEntity.ok(authService.forgotPassword(forgotPasswordRequest));
    }

    /**
     * POST /auth/login : Login user
     *
     * @param loginRequest (required)
     * @return Login successful. (status code 200)
     * or Unauthorized. (status code 401)
     * or Invalid request. (status code 400)
     */
    @Override
    public ResponseEntity<AuthResponse> loginUser(LoginRequest loginRequest) {
        return ResponseEntity.ok(authService.login(loginRequest));
    }

    /**
     * POST /auth/logout : Logout current session
     *
     * @return Logged out successfully. (status code 204)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<Void> logoutUser() {
        return ResponseEntity.ok(authService.logout());
    }

    /**
     * POST /auth/refresh : Refresh access token
     *
     * @param refreshTokenRequest (required)
     * @return Token refreshed. (status code 200)
     * or Invalid request. (status code 400)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<AuthResponse> refreshToken(RefreshTokenRequest refreshTokenRequest) {
        return ResponseEntity.ok(authService.refreshToken(refreshTokenRequest));
    }

    /**
     * POST /auth/register : Register a new user
     *
     * @param registerRequest (required)
     * @return User registered successfully. (status code 201)
     * or Invalid request. (status code 400)
     * or Conflict (status code 409)
     */
    @Override
    public ResponseEntity<AuthResponse> registerUser(RegisterRequest registerRequest) {
        return ResponseEntity.status(201).body(authService.register(registerRequest));
    }

    /**
     * POST /auth/reset-password : Reset password
     *
     * @param resetPasswordRequest (required)
     * @return Password reset successful. (status code 204)
     * or Invalid request. (status code 400)
     */
    @Override
    public ResponseEntity<Void> resetPassword(ResetPasswordRequest resetPasswordRequest) {
        return ResponseEntity.ok(authService.resetPassword(resetPasswordRequest));
    }
}
