package com.verita.contentservice.dto;
import jakarta.validation.constraints.NotBlank;
import java.util.UUID;
public record CommentRequest(@NotBlank String text, UUID parentId) {}
