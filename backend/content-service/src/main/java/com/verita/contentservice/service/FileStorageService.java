package com.verita.contentservice.service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

/**
 * Stores post images/covers in object storage and returns their public URL (Epic 2 / P1). The
 * multipart proxy keeps binary out of every JSON body and MinIO internal-only: callers upload here,
 * receive a URL, then reference that URL in the post (cover or inline Markdown).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FileStorageService {

    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp",
            "image/gif", ".gif"
    );

    private final S3Client s3Client;

    @Value("${app.storage.s3.public-endpoint}")
    private String publicEndpoint;

    @Value("${app.storage.buckets.post-photos}")
    private String bucket;

    @Value("${app.storage.max-file-bytes}")
    private long maxFileBytes;

    public String store(MultipartFile file) {
        String extension = validate(file);
        String key = UUID.randomUUID() + extension;

        PutObjectRequest request = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(file.getContentType())
                .contentLength(file.getSize())
                .build();

        try (InputStream input = file.getInputStream()) {
            s3Client.putObject(request, RequestBody.fromInputStream(input, file.getSize()));
        } catch (IOException ex) {
            throw new IllegalStateException("Could not read uploaded file", ex);
        }
        return publicEndpoint + "/" + bucket + "/" + key;
    }

    private String validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ResponseStatusException(BAD_REQUEST, "File is required and must not be empty.");
        }
        if (file.getSize() > maxFileBytes) {
            throw new ResponseStatusException(BAD_REQUEST, "File exceeds the maximum allowed size.");
        }
        String extension = EXTENSIONS.get(file.getContentType());
        if (extension == null) {
            throw new ResponseStatusException(BAD_REQUEST, "File must be a PNG, JPEG, WebP, or GIF image.");
        }
        return extension;
    }
}
