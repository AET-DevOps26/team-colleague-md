package com.verita.contentservice.controller;

import com.verita.api.FilesApi;
import com.verita.contentservice.service.FileStorageService;
import com.verita.model.FileUploadResponse;
import java.net.URI;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@Validated
@RequiredArgsConstructor
public class FileController implements FilesApi {
    private final FileStorageService fileStorageService;

    @Override
    public ResponseEntity<FileUploadResponse> uploadFile(MultipartFile file) {
        String url = fileStorageService.store(file);
        return ResponseEntity.status(201).body(new FileUploadResponse().url(URI.create(url)));
    }
}
