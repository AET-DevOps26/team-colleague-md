package com.verita.contentservice.dto;
import java.util.List;
public record PostPage(List<PostResponse> content, int page, int size, int totalPages, long totalElements) {}
