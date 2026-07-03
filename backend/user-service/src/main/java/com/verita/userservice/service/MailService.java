package com.verita.userservice.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Thin wrapper over {@link JavaMailSender} for transactional account emails.
 *
 * <p>The SMTP endpoint is environment-driven (Mailpit locally, Brevo in production) via
 * {@code spring.mail.*}; this class only knows how to compose the messages.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;
    private final String from;
    private final int ttlMinutes;

    public MailService(JavaMailSender mailSender,
                       @Value("${app.mail.from}") String from,
                       @Value("${app.mail.reset-code-ttl-minutes}") int ttlMinutes) {
        this.mailSender = mailSender;
        this.from = from;
        this.ttlMinutes = ttlMinutes;
    }

    /**
     * Sends the 6-digit password-reset code to the given address.
     *
     * <p>Failures are logged and swallowed: the caller always reports success to avoid leaking
     * whether an account exists (and to keep the forgot-password response timing uniform).
     */
    public void sendPasswordResetCode(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(to);
        message.setSubject("Your Verita password reset code");
        message.setText("""
                You requested a password reset for your Verita account.

                Your verification code is: %s

                It expires in %d minutes. If you did not request this, you can safely ignore this email.
                """.formatted(code, ttlMinutes));
        try {
            mailSender.send(message);
        } catch (MailException ex) {
            log.error("Failed to send password reset email to {}", to, ex);
        }
    }
}
