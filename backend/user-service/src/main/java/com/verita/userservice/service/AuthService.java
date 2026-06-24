package com.verita.userservice.service;

import com.verita.model.AuthResponse;
import com.verita.model.LoginRequest;
import com.verita.model.RegisterRequest;
import com.verita.userservice.exception.*;
import com.verita.userservice.entity.UserEntity;
import com.verita.userservice.repository.UserRepository;
import com.verita.userservice.security.JwtUtils;
import com.verita.userservice.security.UserDetailsImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Service handling all authentication operations: registration, login, token refresh, and logout.
 *
 * <p>All token-issuing paths delegate to {@link #buildAuthResponse} so JWT generation,
 * refresh-token rotation, and AuthResponse population are handled in one place.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final PasswordEncoder encoder;
    private final JwtUtils jwtUtils;
    private final UserService userService;

    /**
     * Registers a new user and returns a fully populated {@link AuthResponse}.
     *
     * <p>Note: {@code @Transactional} is intentionally omitted so {@code save()} commits
     * immediately, making the new row visible to {@code loadUserByUsername()} below.
     *
     * @throws DuplicateUsernameException if the username is already taken
     * @throws DuplicateEmailException    if the email address is already registered
     */
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateUsernameException(request.getUsername());
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException(request.getEmail());
        }

        UserEntity user = new UserEntity();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(encoder.encode(request.getPassword()));
        user.setDisplayName(request.getUsername());
        userRepository.save(user);

        return authenticateAndToken(request.getUsername(), request.getPassword());
    }

    /**
     * Authenticates an existing user by email and returns an {@link AuthResponse}.
     *
     * @throws UserNotFoundException if no account is registered with the given email
     */
    public AuthResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UserNotFoundException(request.getEmail()));
        return authenticateAndToken(user.getUsername(), request.getPassword());
    }

    /**
     * Validates the given refresh token, rotates it (issues a new one), and returns
     * a new {@link AuthResponse} with a fresh access token.
     *
     * @param refreshTokenValue the current refresh token UUID from the httpOnly cookie
     * @throws InvalidRefreshTokenException if the token does not exist or has expired
     */
    public AuthResponse refreshToken(String refreshTokenValue) {
        UserEntity user = userRepository.findByRefreshToken(refreshTokenValue)
                .orElseThrow(InvalidRefreshTokenException::new);

        if (user.getRefreshTokenExpiry() == null || user.getRefreshTokenExpiry().isBefore(OffsetDateTime.now())) {
            throw new InvalidRefreshTokenException();
        }

        UserDetailsImpl principal = UserDetailsImpl.build(user);
        Authentication authentication = new UsernamePasswordAuthenticationToken(
                principal, null, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(authentication);

        return buildAuthResponse(user, authentication);
    }

    /**
     * Invalidates the refresh token associated with the given value, effectively logging out
     * the session that holds this token.
     *
     * @param refreshTokenValue the refresh token UUID from the httpOnly cookie (may be null)
     */
    public void logout(String refreshTokenValue) {
        if (refreshTokenValue == null) return;
        userRepository.findByRefreshToken(refreshTokenValue).ifPresent(user -> {
            user.setRefreshToken(null);
            user.setRefreshTokenExpiry(null);
            userRepository.save(user);
        });
    }

    /**
     * Checks whether a username is available for registration.
     *
     * @return {@code true} if the username is not yet taken
     */
    public boolean checkUsernameAvailable(String username) {
        return !userRepository.existsByUsername(username);
    }

    /**
     * Checks whether an email address is available for registration.
     *
     * @return {@code true} if no account uses this email
     */
    public boolean checkEmailAvailable(String email) {
        return !userRepository.existsByEmail(email);
    }

    /** Not yet implemented. TODO: implement password reset email flow. */
    public Void forgotPassword(com.verita.model.ForgotPasswordRequest request) {
        return null;
    }

    /** Not yet implemented. TODO: implement password reset with OTP validation. */
    public Void resetPassword(com.verita.model.ResetPasswordRequest request) {
        return null;
    }

    // --- Private helpers ---

    private AuthResponse authenticateAndToken(String username, String password) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password));
        SecurityContextHolder.getContext().setAuthentication(authentication);

        UserEntity user = userRepository.findByUsername(username).orElseThrow();
        return buildAuthResponse(user, authentication);
    }

    /**
     * Generates a new access token and rotates the refresh token for the given user.
     * Persists the new refresh token to the database before returning the response.
     */
    private AuthResponse buildAuthResponse(UserEntity user, Authentication authentication) {
        String newRefreshToken = UUID.randomUUID().toString();
        user.setRefreshToken(newRefreshToken);
        user.setRefreshTokenExpiry(
                OffsetDateTime.now().plusSeconds(jwtUtils.getRefreshExpirationMs() / 1000));
        userRepository.save(user);

        AuthResponse response = new AuthResponse();
        response.setAccessToken(jwtUtils.generateJwtToken(authentication));
        response.setRefreshToken(newRefreshToken);
        response.setTokenType("Bearer");
        response.setExpiresIn(jwtUtils.getExpirationMs() / 1000);
        response.setUser(userService.getByUsername(user.getUsername()));
        return response;
    }
}
