package com.verita.userservice;

import com.verita.model.AuthResponse;
import com.verita.model.LoginRequest;
import com.verita.model.RegisterRequest;
import com.verita.model.User;
import com.verita.userservice.exception.*;
import com.verita.userservice.repository.UserEntity;
import com.verita.userservice.repository.UserRepository;
import com.verita.userservice.security.JwtUtils;
import com.verita.userservice.security.UserDetailsImpl;
import com.verita.userservice.service.AuthService;
import com.verita.userservice.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

public class AuthServiceTests {

    @Mock private AuthenticationManager authenticationManager;
    @Mock private UserRepository userRepository;
    @Mock private PasswordEncoder encoder;
    @Mock private JwtUtils jwtUtils;
    @Mock private UserService userService;
    @InjectMocks private AuthService authService;

    private UserDetailsImpl principal;
    private User userDto;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        principal = new UserDetailsImpl(UUID.randomUUID(), "testuser", "test@test.com", "hashed", List.of());
        userDto = new User();
        userDto.setUsername("testuser");
    }

    @Test
    void register_success() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("testuser");
        request.setEmail("test@test.com");
        request.setPassword("password");

        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@test.com")).thenReturn(false);
        when(encoder.encode("password")).thenReturn("hashed");

        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(principal);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(jwtUtils.generateJwtToken(auth)).thenReturn("jwt-token");
        when(userService.getByUsername("testuser")).thenReturn(userDto);

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("jwt-token", response.getAccessToken());
        assertNotNull(response.getUser());
        verify(userRepository, times(1)).save(any(UserEntity.class));
    }

    @Test
    void register_fail_duplicateUsername() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("testuser");
        request.setEmail("test@test.com");
        request.setPassword("password");

        when(userRepository.existsByUsername("testuser")).thenReturn(true);

        assertThrows(DuplicateUsernameException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void register_fail_duplicateEmail() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("testuser");
        request.setEmail("test@test.com");
        request.setPassword("password");

        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@test.com")).thenReturn(true);

        assertThrows(DuplicateEmailException.class, () -> authService.register(request));
        verify(userRepository, never()).save(any());
    }

    @Test
    void login_success() {
        LoginRequest request = new LoginRequest();
        request.setEmail("test@test.com");
        request.setPassword("password");

        UserEntity userEntity = new UserEntity();
        userEntity.setUsername("testuser");
        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(userEntity));

        Authentication auth = mock(Authentication.class);
        when(auth.getPrincipal()).thenReturn(principal);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(jwtUtils.generateJwtToken(auth)).thenReturn("jwt-token");
        when(userService.getByUsername("testuser")).thenReturn(userDto);

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("jwt-token", response.getAccessToken());
        assertNotNull(response.getUser());
    }

    @Test
    void login_fail_userNotFound() {
        LoginRequest request = new LoginRequest();
        request.setEmail("unknown@test.com");
        request.setPassword("password");

        when(userRepository.findByEmail("unknown@test.com")).thenReturn(Optional.empty());

        assertThrows(UserNotFoundException.class, () -> authService.login(request));
    }
}
