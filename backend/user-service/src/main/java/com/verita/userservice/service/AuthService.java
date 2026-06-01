package com.verita.userservice.service;

import com.verita.model.AuthResponse;
import com.verita.model.LoginRequest;
import com.verita.model.RegisterRequest;
import com.verita.model.UserRole;
import com.verita.userservice.repository.UserEntity;
import com.verita.userservice.repository.UserRepository;
import com.verita.userservice.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtUtils jwtUtils;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
             throw new IllegalArgumentException("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
             throw new IllegalArgumentException("Error: Email is already in use!");
        }

        UserEntity user = new UserEntity();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPassword(encoder.encode(request.getPassword()));
        user.setDisplayName(request.getUsername()); // default

        userRepository.save(user);

        return authenticateAndToken(request.getUsername(), request.getPassword());
    }

    public AuthResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("Error: User not found with email"));
        return authenticateAndToken(user.getUsername(), request.getPassword());
    }

    private AuthResponse authenticateAndToken(String username, String password) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        AuthResponse response = new AuthResponse();
        response.setAccessToken(jwt);
        return response;
    }

    public Void logout() {
        return null;
    }

    public Void forgotPassword(com.verita.model.ForgotPasswordRequest request) {
        return null;
    }

    public Void resetPassword(com.verita.model.ResetPasswordRequest request) {
        return null;
    }

    public AuthResponse refreshToken(com.verita.model.RefreshTokenRequest request) {
        return null; // Simplified dummy behavior for those endpoints, as requested
    }
}

