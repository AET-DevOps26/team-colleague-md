package com.verita.contentservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;

class FileStorageServiceTest {

    @Mock private S3Client s3Client;
    @InjectMocks private FileStorageService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        ReflectionTestUtils.setField(service, "publicEndpoint", "http://localhost:9000");
        ReflectionTestUtils.setField(service, "bucket", "verita-post-photos");
        ReflectionTestUtils.setField(service, "maxFileBytes", 5_242_880L);
    }

    @Test
    void store_imageFile_uploadsAndReturnsPublicUrl() {
        MockMultipartFile file = new MockMultipartFile("file", "pic.png", "image/png", new byte[]{1, 2, 3});

        String url = service.store(file);

        assertTrue(url.startsWith("http://localhost:9000/verita-post-photos/"));
        assertTrue(url.endsWith(".png"));
        verify(s3Client).putObject(any(PutObjectRequest.class), any(RequestBody.class));
    }

    @Test
    void store_nonImage_throwsBadRequest() {
        MockMultipartFile file = new MockMultipartFile("file", "doc.txt", "text/plain", new byte[]{1});
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.store(file));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void store_emptyFile_throwsBadRequest() {
        MockMultipartFile file = new MockMultipartFile("file", "pic.png", "image/png", new byte[]{});
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.store(file));
        assertEquals(400, ex.getStatusCode().value());
    }

    @Test
    void store_oversizeFile_throwsBadRequest() {
        ReflectionTestUtils.setField(service, "maxFileBytes", 2L);
        MockMultipartFile file = new MockMultipartFile("file", "pic.png", "image/png", new byte[]{1, 2, 3, 4});
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> service.store(file));
        assertEquals(400, ex.getStatusCode().value());
    }
}
