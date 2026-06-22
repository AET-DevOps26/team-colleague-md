package com.verita.userservice.service;

import com.verita.userservice.exception.InvalidAvatarException;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AvatarStorageService {
    private static final Logger log = LoggerFactory.getLogger(AvatarStorageService.class);
    private static final long MAX_AVATAR_BYTES = 2L * 1024 * 1024;
    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png"
    );

    private final S3Client s3Client;

    @Value("${app.storage.s3.public-endpoint}")
    private String publicEndpoint;

    @Value("${app.storage.buckets.user-portraits}")
    private String bucket;

    public String storeAvatar(UUID userId, MultipartFile avatar) {
        String extension = validateAvatar(avatar);
        String key = "users/" + userId + "/avatar-" + UUID.randomUUID() + extension;

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(avatar.getContentType())
                .contentLength(avatar.getSize())
                .build();

        try (InputStream input = avatar.getInputStream()) {
            s3Client.putObject(request, RequestBody.fromInputStream(input, avatar.getSize()));
        } catch (IOException ex) {
            throw new IllegalStateException("Could not read avatar file", ex);
        }

        return objectUrl(key);
    }

    public void deleteAvatar(String avatarUrl) {
        objectKeyFromUrl(avatarUrl).ifPresent(key -> {
            try {
                s3Client.deleteObject(DeleteObjectRequest.builder()
                        .bucket(bucket)
                        .key(key)
                        .build());
            } catch (RuntimeException ex) {
                log.warn("Could not delete avatar object {}", key, ex);
            }
        });
    }

    private String validateAvatar(MultipartFile avatar) {
        if (avatar == null) {
            throw new InvalidAvatarException("Avatar file is required.");
        }
        if (avatar.isEmpty()) {
            throw new InvalidAvatarException("Avatar file must not be empty.");
        }
        if (avatar.getSize() > MAX_AVATAR_BYTES) {
            throw new InvalidAvatarException("Avatar file must be at most 2 MB.");
        }

        String extension = EXTENSIONS.get(avatar.getContentType());
        if (extension == null) {
            throw new InvalidAvatarException("Avatar file must be JPEG or PNG.");
        }
        return extension;
    }

    private Optional<String> objectKeyFromUrl(String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return Optional.empty();
        }

        String prefix = objectUrl("");
        if (!avatarUrl.startsWith(prefix)) {
            return Optional.empty();
        }

        String key = avatarUrl.substring(prefix.length());
        return key.isBlank() ? Optional.empty() : Optional.of(key);
    }

    private String objectUrl(String key) {
        return publicEndpoint.replaceAll("/+$", "") + "/" + bucket + "/" + key;
    }
}
