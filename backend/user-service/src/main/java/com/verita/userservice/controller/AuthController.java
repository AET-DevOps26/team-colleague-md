package com.verita.userservice.controller;

import com.verita.api.AuthenticationApi;
import com.verita.model.*;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import com.verita.userservice.service.AuthService;

/**
 * REST controller implementing the OpenAPI {@link AuthenticationApi} interface.
 * Handles registration, login, token refresh, logout, and availability checks.
 *
 * <p>The refresh token is stored in an {@code HttpOnly} cookie scoped to
 * {@code /api/v1/auth} so it is never exposed to JavaScript.
 */
@RestController
@RequiredArgsConstructor
public class AuthController implements AuthenticationApi {

    static final String REFRESH_COOKIE = "refreshToken";

    private final AuthService authService;
    private final HttpServletRequest httpRequest;
    private final HttpServletResponse httpResponse;

    @Override
    public ResponseEntity<AuthResponse> loginUser(LoginRequest loginRequest) {
        AuthResponse auth = authService.login(loginRequest);
        setRefreshCookie(auth.getRefreshToken());
        return ResponseEntity.ok(auth);
    }

    @Override
    public ResponseEntity<AuthResponse> registerUser(RegisterRequest registerRequest) {
        AuthResponse auth = authService.register(registerRequest);
        setRefreshCookie(auth.getRefreshToken());
        return ResponseEntity.status(201).body(auth);
    }

    @Override
    public ResponseEntity<AuthResponse> refreshToken(RefreshTokenRequest refreshTokenRequest) {
        String token = readRefreshCookie();
        AuthResponse auth = authService.refreshToken(token);
        setRefreshCookie(auth.getRefreshToken());
        return ResponseEntity.ok(auth);
    }

    @Override
    public ResponseEntity<Void> logoutUser() {
        String token = readRefreshCookie();
        authService.logout(token);
        clearRefreshCookie();
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<Void> forgotPassword(ForgotPasswordRequest forgotPasswordRequest) {
        return ResponseEntity.ok(authService.forgotPassword(forgotPasswordRequest));
    }

    @Override
    public ResponseEntity<Void> resetPassword(ResetPasswordRequest resetPasswordRequest) {
        return ResponseEntity.ok(authService.resetPassword(resetPasswordRequest));
    }

    @Override
    public ResponseEntity<AvailabilityResponse> checkUsername(String username) {
        return ResponseEntity.ok(new AvailabilityResponse(authService.checkUsernameAvailable(username)));
    }

    @Override
    public ResponseEntity<AvailabilityResponse> checkEmail(String email) {
        return ResponseEntity.ok(new AvailabilityResponse(authService.checkEmailAvailable(email)));
    }

    // --- Cookie helpers ---

    private void setRefreshCookie(String token) {
        Cookie cookie = new Cookie(REFRESH_COOKIE, token);
        cookie.setHttpOnly(true);
        cookie.setPath("/api/v1/auth");
        cookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        // cookie.setSecure(true); // enable in production (requires HTTPS)
        httpResponse.addCookie(cookie);
    }

    private void clearRefreshCookie() {
        Cookie cookie = new Cookie(REFRESH_COOKIE, "");
        cookie.setHttpOnly(true);
        cookie.setPath("/api/v1/auth");
        cookie.setMaxAge(0);
        httpResponse.addCookie(cookie);
    }

    private String readRefreshCookie() {
        if (httpRequest.getCookies() == null) return null;
        for (Cookie c : httpRequest.getCookies()) {
            if (REFRESH_COOKIE.equals(c.getName())) return c.getValue();
        }
        return null;
    }
}
