package com.verita.contentservice.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * One external source cited by a digest event, stored inside the {@code events} JSONB column.
 * {@code publishedAt} is kept as an absolute ISO-8601 string; the frontend computes the relative
 * "Xh ago" label (ADR-0019) so historical reads never go stale.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DigestSourceData {
    private String url;
    private String sourceName;
    private String provider;
    private String publishedAt;
    private String title;
}
