package com.verita.contentservice.dto;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
public record PostRequest(@NotBlank @Size(min = 5, max = 100) String title, @NotBlank String content, @Size(max = 500) String excerpt, String coverImageUrl, List<String> sourceUrl, List<String> tags, String status) {}
