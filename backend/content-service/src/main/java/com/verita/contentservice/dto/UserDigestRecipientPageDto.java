package com.verita.contentservice.dto;

import java.util.List;

public record UserDigestRecipientPageDto(
        List<UserDigestRecipientDto> content,
        int page,
        int size,
        int totalPages,
        long totalElements,
        boolean hasNext
) {}
