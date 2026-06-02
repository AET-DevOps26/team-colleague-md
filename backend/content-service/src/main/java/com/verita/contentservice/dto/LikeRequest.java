package com.verita.contentservice.dto;
import jakarta.validation.constraints.NotBlank;
public record LikeRequest(@NotBlank String type) {}
