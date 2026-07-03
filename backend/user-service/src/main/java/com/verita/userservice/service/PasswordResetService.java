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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Implements the two-step OTP password-reset flow:
 * <ol>
 *   <li>{@link #forgotPassword} emails a 6-digit code (hashed at rest, short TTL).</li>
 *   <li>{@link #verifyResetCode} exchanges email + code for a single-use {@code resetToken}.</li>
 *   <li>{@link #resetPassword} consumes the token, sets the new password, and revokes sessions.</li>
 * </ol>
 *
 * <p>Kept separate from {@link AuthService} so the reset-specific dependencies (token repository,
 * mail) and tests stay isolated.
 */
@Service
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder encoder;
    private final MailService mailService;
    private final int ttlMinutes;
    private final int maxAttempts;

    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetTokenRepository tokenRepository,
                                PasswordEncoder encoder,
                                MailService mailService,
                                @Value("${app.mail.reset-code-ttl-minutes}") int ttlMinutes,
                                @Value("${app.mail.reset-max-attempts}") int maxAttempts) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.encoder = encoder;
        this.mailService = mailService;
        this.ttlMinutes = ttlMinutes;
        this.maxAttempts = maxAttempts;
    }

    /**
     * Issues a fresh reset code for the address if it belongs to a registered account, replacing
     * any previous code. Silently no-ops for unknown addresses so callers cannot enumerate accounts.
     */
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail()).orElse(null);
        if (user == null) {
            return; // Unknown email — do not reveal, do not send.
        }

        tokenRepository.deleteByUserId(user.getId());

        String code = String.format("%06d", random.nextInt(1_000_000));
        PasswordResetTokenEntity entity = new PasswordResetTokenEntity();
        entity.setUserId(user.getId());
        entity.setCodeHash(encoder.encode(code));
        entity.setExpiresAt(OffsetDateTime.now().plusMinutes(ttlMinutes));
        tokenRepository.save(entity);

        mailService.sendPasswordResetCode(user.getEmail(), code);
    }

    /**
     * Validates the 6-digit code and, on success, stamps and returns a single-use reset token.
     * Wrong codes increment the attempt counter; exhausting attempts or expiry invalidates the code.
     *
     * @throws InvalidPasswordResetException if the code is unknown, wrong, expired, or over the attempt limit
     */
    @Transactional
    public VerifyResetCodeResponse verifyResetCode(VerifyResetCodeRequest request) {
        UserEntity user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(InvalidPasswordResetException::new);

        PasswordResetTokenEntity entity = tokenRepository.findByUserId(user.getId())
                .orElseThrow(InvalidPasswordResetException::new);

        if (isExpired(entity) || entity.getAttempts() >= maxAttempts) {
            throw new InvalidPasswordResetException();
        }

        if (!encoder.matches(request.getCode(), entity.getCodeHash())) {
            entity.setAttempts(entity.getAttempts() + 1);
            tokenRepository.save(entity);
            throw new InvalidPasswordResetException();
        }

        entity.setResetToken(UUID.randomUUID().toString());
        tokenRepository.save(entity);

        VerifyResetCodeResponse response = new VerifyResetCodeResponse();
        response.setResetToken(entity.getResetToken());
        return response;
    }

    /**
     * Sets a new password for the account tied to the reset token, then revokes the token and any
     * active refresh-token session (forcing re-login everywhere).
     *
     * @throws InvalidPasswordResetException if the token is unknown or expired
     */
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetTokenEntity entity = tokenRepository.findByResetToken(request.getToken())
                .orElseThrow(InvalidPasswordResetException::new);

        if (isExpired(entity)) {
            throw new InvalidPasswordResetException();
        }

        UserEntity user = userRepository.findById(entity.getUserId())
                .orElseThrow(InvalidPasswordResetException::new);

        user.setPassword(encoder.encode(request.getNewPassword()));
        user.setRefreshToken(null);
        user.setRefreshTokenExpiry(null);
        userRepository.save(user);

        tokenRepository.deleteByUserId(user.getId());
    }

    private boolean isExpired(PasswordResetTokenEntity entity) {
        return entity.getExpiresAt() == null || entity.getExpiresAt().isBefore(OffsetDateTime.now());
    }
}
