package com.verita.contentservice.service;

import java.util.UUID;

public record PostSummaryRequestedEvent(UUID postId, String title, String content, String authorization) {}
