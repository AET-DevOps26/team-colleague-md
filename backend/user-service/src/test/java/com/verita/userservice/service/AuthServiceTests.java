package com.verita.userservice.service;

import com.verita.model.AuthResponse;
import com.verita.model.LoginRequest;
import com.verita.model.RegisterRequest;
import com.verita.model.User;
import com.verita.userservice.exception.*;
import com.verita.userservice.entity.UserEntity;
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

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
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
    private UserEntity userEntity;
    private User userDto;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        userEntity = new UserEntity();
        userEntity.setUsername("testuser");
        userEntity.setEmail("test@test.com");
        userEntity.setPassword("hashed");

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
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        when(userService.getByUsername("testuser")).thenReturn(userDto);

        Authentication auth = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(jwtUtils.generateJwtToken(auth)).thenReturn("jwt-token");

        AuthResponse response = authService.register(request);

        assertNotNull(response);
        assertEquals("jwt-token", response.getAccessToken());
        assertEquals("Bearer", response.getTokenType());
        assertNotNull(response.getRefreshToken());
        assertNotNull(response.getUser());
        // save() called twice: initial user save + refresh token save in buildAuthResponse
        verify(userRepository, times(2)).save(any(UserEntity.class));
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

        when(userRepository.findByEmail("test@test.com")).thenReturn(Optional.of(userEntity));
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        when(userService.getByUsername("testuser")).thenReturn(userDto);

        Authentication auth = mock(Authentication.class);
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class))).thenReturn(auth);
        when(jwtUtils.generateJwtToken(auth)).thenReturn("jwt-token");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("jwt-token", response.getAccessToken());
        assertEquals("Bearer", response.getTokenType());
        assertNotNull(response.getRefreshToken());
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

    @Test
    void refreshToken_success_rotatesToken() {
        userEntity.setRefreshToken("old-token");
        userEntity.setRefreshTokenExpiry(OffsetDateTime.now().plusDays(1));

        when(userRepository.findByRefreshToken("old-token")).thenReturn(Optional.of(userEntity));
        when(userService.getByUsername("testuser")).thenReturn(userDto);
        when(jwtUtils.generateJwtToken(any())).thenReturn("new-access-token");
        when(jwtUtils.getRefreshExpirationMs()).thenReturn(604800000L);

        AuthResponse response = authService.refreshToken("old-token");

        assertNotNull(response);
        assertEquals("new-access-token", response.getAccessToken());
        assertNotNull(response.getRefreshToken());
        assertNotEquals("old-token", response.getRefreshToken());
        verify(userRepository).save(userEntity);
    }

    @Test
    void refreshToken_blank_throwsWithoutQueryingRepository() {
        // A null/blank token must short-circuit: querying findByRefreshToken(null) matches every
        // NULL-token row and throws a non-unique result (500) instead of the intended 401.
        assertThrows(InvalidRefreshTokenException.class, () -> authService.refreshToken(null));
        assertThrows(InvalidRefreshTokenException.class, () -> authService.refreshToken("  "));
        verify(userRepository, never()).findByRefreshToken(any());
    }

    @Test
    void refreshToken_fail_tokenNotFound() {
        when(userRepository.findByRefreshToken("bad-token")).thenReturn(Optional.empty());

        assertThrows(InvalidRefreshTokenException.class, () -> authService.refreshToken("bad-token"));
    }

    @Test
    void refreshToken_fail_tokenExpired() {
        userEntity.setRefreshToken("expired-token");
        userEntity.setRefreshTokenExpiry(OffsetDateTime.now().minusDays(1));

        when(userRepository.findByRefreshToken("expired-token")).thenReturn(Optional.of(userEntity));

        assertThrows(InvalidRefreshTokenException.class, () -> authService.refreshToken("expired-token"));
    }

    @Test
    void logout_clearsRefreshToken() {
        userEntity.setRefreshToken("valid-token");
        when(userRepository.findByRefreshToken("valid-token")).thenReturn(Optional.of(userEntity));

        authService.logout("valid-token");

        assertNull(userEntity.getRefreshToken());
        assertNull(userEntity.getRefreshTokenExpiry());
        verify(userRepository).save(userEntity);
    }

    @Test
    void logout_nullToken_isNoOp() {
        authService.logout(null);
        verify(userRepository, never()).findByRefreshToken(any());
    }
}
