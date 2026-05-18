package com.verita.userservice.controller;

import com.verita.api.AuthApi;
import com.verita.model.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController implements AuthApi {
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
        return null;
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
        return null;
    }

    /**
     * POST /auth/logout : Logout current session
     *
     * @return Logged out successfully. (status code 204)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<Void> logoutUser() {
        return null;
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
        return null;
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
        return null;
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
        return null;
    }
}
