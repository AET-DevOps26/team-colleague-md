package com.verita.contentservice.dto;
import java.util.List;
public record GenAiSummarizeResponse(String postId, List<String> summary, String model, Object usage) {}
