package com.verita.recommendationservice.client.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.util.List;

/** content-service {@code PostPage} envelope; only the post content list is consumed here. */
@JsonIgnoreProperties(ignoreUnknown = true)
public record PostPageDto(List<PostRankDto> content) {
}
