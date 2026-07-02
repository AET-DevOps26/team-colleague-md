package com.verita.userservice.controller;

import com.verita.api.InternalApi;
import com.verita.model.DigestFrequency;
import com.verita.model.PaginatedDigestRecipients;
import com.verita.model.UserPreferences;
import com.verita.userservice.service.UserService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class InternalController implements InternalApi {
    private final UserService userService;

    @Override
    public ResponseEntity<PaginatedDigestRecipients> getDigestRecipients(DigestFrequency frequency, Integer page, Integer size) {
        return ResponseEntity.ok(userService.getDigestRecipients(frequency, page, size));
    }

    @Override
    public ResponseEntity<UserPreferences> getUserPreferencesByUserId(UUID userId) {
        return ResponseEntity.ok(userService.getPreferencesById(userId));
    }
}
