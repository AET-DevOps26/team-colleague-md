package com.verita.userservice.service;

import com.verita.model.AuthResponse;
import com.verita.model.LoginRequest;
import com.verita.model.RegisterRequest;
import com.verita.userservice.exception.*;
import com.verita.userservice.repository.UserEntity;
import com.verita.userservice.repository.UserRepository;
import com.verita.userservice.security.JwtUtils;
import com.verita.userservice.security.UserDetailsImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

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

    @Autowired
    private UserService userService;

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

        // save() commits in its own transaction so the new row is visible to
        // loadUserByUsername() inside authenticateAndToken() below.
        userRepository.save(user);

        return authenticateAndToken(request.getUsername(), request.getPassword());
    }

    public AuthResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UserNotFoundException(request.getEmail()));
        return authenticateAndToken(user.getUsername(), request.getPassword());
    }

    private AuthResponse authenticateAndToken(String username, String password) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(username, password));

        SecurityContextHolder.getContext().setAuthentication(authentication);

        UserDetailsImpl principal = (UserDetailsImpl) authentication.getPrincipal();
        String jwt = jwtUtils.generateJwtToken(authentication);

        AuthResponse response = new AuthResponse();
        response.setAccessToken(jwt);
        response.setUser(userService.getByUsername(principal.getUsername()));
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
        return null;
    }
}
