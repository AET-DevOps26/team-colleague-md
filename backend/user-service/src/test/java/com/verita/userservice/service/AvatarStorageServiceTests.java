package com.verita.userservice.service;

import com.verita.userservice.exception.InvalidAvatarException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectResponse;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AvatarStorageServiceTests {
    private S3Client s3Client;
    private AvatarStorageService avatarStorageService;

    @BeforeEach
    void setUp() {
        s3Client = mock(S3Client.class);
        avatarStorageService = new AvatarStorageService(s3Client);
        ReflectionTestUtils.setField(avatarStorageService, "publicEndpoint", "http://localhost:9000");
        ReflectionTestUtils.setField(avatarStorageService, "bucket", "verita-user-portraits");
    }

    @Test
    void storeAvatar_uploadsPngAndReturnsPublicUrl() {
        UUID userId = UUID.randomUUID();
        MockMultipartFile avatar = new MockMultipartFile("avatar", "avatar.png", "image/png", new byte[]{1, 2, 3});
        when(s3Client.putObject(any(PutObjectRequest.class), any(RequestBody.class)))
                .thenReturn(PutObjectResponse.builder().build());

        String url = avatarStorageService.storeAvatar(userId, avatar);

        assertTrue(url.startsWith("http://localhost:9000/verita-user-portraits/users/" + userId + "/avatar-"));
        assertTrue(url.endsWith(".png"));

        ArgumentCaptor<PutObjectRequest> request = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(s3Client).putObject(request.capture(), any(RequestBody.class));
        assertEquals("verita-user-portraits", request.getValue().bucket());
        assertEquals("image/png", request.getValue().contentType());
        assertTrue(request.getValue().key().startsWith("users/" + userId + "/avatar-"));
        assertTrue(request.getValue().key().endsWith(".png"));
    }

    @Test
    void storeAvatar_rejectsEmptyFile() {
        MockMultipartFile avatar = new MockMultipartFile("avatar", "avatar.png", "image/png", new byte[]{});

        InvalidAvatarException ex = assertThrows(
                InvalidAvatarException.class,
                () -> avatarStorageService.storeAvatar(UUID.randomUUID(), avatar)
        );

        assertEquals("Avatar file must not be empty.", ex.getMessage());
    }

    @Test
    void storeAvatar_rejectsUnsupportedContentType() {
        MockMultipartFile avatar = new MockMultipartFile("avatar", "avatar.gif", "image/gif", new byte[]{1, 2, 3});

        InvalidAvatarException ex = assertThrows(
                InvalidAvatarException.class,
                () -> avatarStorageService.storeAvatar(UUID.randomUUID(), avatar)
        );

        assertEquals("Avatar file must be JPEG or PNG.", ex.getMessage());
    }

    @Test
    void storeAvatar_rejectsFilesOverTwoMegabytes() {
        MockMultipartFile avatar = new MockMultipartFile("avatar", "avatar.png", "image/png", new byte[(2 * 1024 * 1024) + 1]);

        InvalidAvatarException ex = assertThrows(
                InvalidAvatarException.class,
                () -> avatarStorageService.storeAvatar(UUID.randomUUID(), avatar)
        );

        assertEquals("Avatar file must be at most 2 MB.", ex.getMessage());
    }

    @Test
    void deleteAvatar_deletesOwnedAvatarUrl() {
        avatarStorageService.deleteAvatar("http://localhost:9000/verita-user-portraits/users/123/avatar-old.png");

        ArgumentCaptor<DeleteObjectRequest> request = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(s3Client).deleteObject(request.capture());
        assertEquals("verita-user-portraits", request.getValue().bucket());
        assertEquals("users/123/avatar-old.png", request.getValue().key());
    }

    @Test
    void deleteAvatar_ignoresExternalAvatarUrl() {
        avatarStorageService.deleteAvatar("https://example.com/avatar.png");

        verify(s3Client, never()).deleteObject(any(DeleteObjectRequest.class));
    }
}
