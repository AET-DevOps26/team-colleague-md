package com.verita.userservice.service;

import com.verita.model.ForgotPasswordRequest;
import com.verita.model.ResetPasswordRequest;
import com.verita.model.VerifyResetCodeRequest;
import com.verita.model.VerifyResetCodeResponse;
import com.verita.userservice.entity.PasswordResetTokenEntity;
import com.verita.userservice.entity.UserEntity;
import com.verita.userservice.exception.InvalidPasswordResetException;
import com.verita.userservice.repository.PasswordResetTokenRepository;
import com.verita.userservice.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

public class PasswordResetServiceTests {

    private static final int TTL_MINUTES = 10;
    private static final int MAX_ATTEMPTS = 5;

    @Mock private UserRepository userRepository;
    @Mock private PasswordResetTokenRepository tokenRepository;
    @Mock private PasswordEncoder encoder;
    @Mock private MailService mailService;

    private PasswordResetService service;

    private UserEntity user;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        // Manual construction so the @Value primitives are deterministic (Mockito @InjectMocks
        // would pass 0 for the int params).
        service = new PasswordResetService(userRepository, tokenRepository, encoder, mailService,
                TTL_MINUTES, MAX_ATTEMPTS);

        user = new UserEntity();
        user.setId(UUID.randomUUID());
        user.setEmail("alice@example.com");
        user.setPassword("old-hash");
    }

    private PasswordResetTokenEntity tokenFor(UserEntity u) {
        PasswordResetTokenEntity e = new PasswordResetTokenEntity();
        e.setUserId(u.getId());
        e.setCodeHash("hashed-code");
        e.setAttempts(0);
        e.setExpiresAt(OffsetDateTime.now().plusMinutes(TTL_MINUTES));
        return e;
    }

    // --- forgotPassword ---

    @Test
    void forgotPassword_knownEmail_storesHashedCodeAndSendsMail() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(encoder.encode(anyString())).thenReturn("hashed-code");

        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setEmail("alice@example.com");
        service.forgotPassword(req);

        verify(tokenRepository).deleteByUserId(user.getId());
        verify(tokenRepository).save(any(PasswordResetTokenEntity.class));

        ArgumentCaptor<String> codeCaptor = ArgumentCaptor.forClass(String.class);
        verify(mailService).sendPasswordResetCode(eq("alice@example.com"), codeCaptor.capture());
        assertTrue(codeCaptor.getValue().matches("^[0-9]{6}$"), "code must be 6 digits");
    }

    @Test
    void forgotPassword_unknownEmail_isSilentNoOp() {
        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        ForgotPasswordRequest req = new ForgotPasswordRequest();
        req.setEmail("ghost@example.com");
        service.forgotPassword(req);

        verify(tokenRepository, never()).deleteByUserId(any());
        verify(tokenRepository, never()).save(any());
        verifyNoInteractions(mailService);
    }

    // --- verifyResetCode ---

    @Test
    void verifyResetCode_validCode_issuesResetToken() {
        PasswordResetTokenEntity entity = tokenFor(user);
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(tokenRepository.findByUserId(user.getId())).thenReturn(Optional.of(entity));
        when(encoder.matches("123456", "hashed-code")).thenReturn(true);

        VerifyResetCodeResponse response = service.verifyResetCode(request("123456"));

        assertNotNull(response.getResetToken());
        assertEquals(response.getResetToken(), entity.getResetToken());
        verify(tokenRepository).save(entity);
    }

    @Test
    void verifyResetCode_wrongCode_incrementsAttemptsAndThrows() {
        PasswordResetTokenEntity entity = tokenFor(user);
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(tokenRepository.findByUserId(user.getId())).thenReturn(Optional.of(entity));
        when(encoder.matches("000000", "hashed-code")).thenReturn(false);

        assertThrows(InvalidPasswordResetException.class, () -> service.verifyResetCode(request("000000")));

        assertEquals(1, entity.getAttempts());
        assertNull(entity.getResetToken());
        verify(tokenRepository).save(entity);
    }

    @Test
    void verifyResetCode_expired_throws() {
        PasswordResetTokenEntity entity = tokenFor(user);
        entity.setExpiresAt(OffsetDateTime.now().minusMinutes(1));
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(tokenRepository.findByUserId(user.getId())).thenReturn(Optional.of(entity));

        assertThrows(InvalidPasswordResetException.class, () -> service.verifyResetCode(request("123456")));
        verify(encoder, never()).matches(anyString(), anyString());
    }

    @Test
    void verifyResetCode_attemptsExhausted_throws() {
        PasswordResetTokenEntity entity = tokenFor(user);
        entity.setAttempts(MAX_ATTEMPTS);
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(tokenRepository.findByUserId(user.getId())).thenReturn(Optional.of(entity));

        assertThrows(InvalidPasswordResetException.class, () -> service.verifyResetCode(request("123456")));
        verify(encoder, never()).matches(anyString(), anyString());
    }

    @Test
    void verifyResetCode_unknownEmail_throws() {
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.empty());

        assertThrows(InvalidPasswordResetException.class, () -> service.verifyResetCode(request("123456")));
    }

    // --- resetPassword ---

    @Test
    void resetPassword_validToken_updatesPasswordRevokesSessionAndDeletesToken() {
        PasswordResetTokenEntity entity = tokenFor(user);
        entity.setResetToken("reset-token");
        user.setRefreshToken("active-refresh");
        user.setRefreshTokenExpiry(OffsetDateTime.now().plusDays(1));

        when(tokenRepository.findByResetToken("reset-token")).thenReturn(Optional.of(entity));
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(encoder.encode("New-Pass-123")).thenReturn("new-hash");

        service.resetPassword(resetRequest("reset-token", "New-Pass-123"));

        assertEquals("new-hash", user.getPassword());
        assertNull(user.getRefreshToken());
        assertNull(user.getRefreshTokenExpiry());
        verify(userRepository).save(user);
        verify(tokenRepository).deleteByUserId(user.getId());
    }

    @Test
    void resetPassword_unknownToken_throws() {
        when(tokenRepository.findByResetToken("bad-token")).thenReturn(Optional.empty());

        assertThrows(InvalidPasswordResetException.class,
                () -> service.resetPassword(resetRequest("bad-token", "New-Pass-123")));
        verify(userRepository, never()).save(any());
    }

    @Test
    void resetPassword_expiredToken_throws() {
        PasswordResetTokenEntity entity = tokenFor(user);
        entity.setResetToken("reset-token");
        entity.setExpiresAt(OffsetDateTime.now().minusMinutes(1));
        when(tokenRepository.findByResetToken("reset-token")).thenReturn(Optional.of(entity));

        assertThrows(InvalidPasswordResetException.class,
                () -> service.resetPassword(resetRequest("reset-token", "New-Pass-123")));
        verify(userRepository, never()).save(any());
    }

    private VerifyResetCodeRequest request(String code) {
        VerifyResetCodeRequest req = new VerifyResetCodeRequest();
        req.setEmail("alice@example.com");
        req.setCode(code);
        return req;
    }

    private ResetPasswordRequest resetRequest(String token, String newPassword) {
        ResetPasswordRequest req = new ResetPasswordRequest();
        req.setToken(token);
        req.setNewPassword(newPassword);
        return req;
    }
}
