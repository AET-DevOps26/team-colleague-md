package com.verita.contentservice.entity;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** One digest-worthy development, stored as an element of the {@code events} JSONB column. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DigestEventData {
    private String headline;
    private List<String> summaryBullets = new ArrayList<>();
    private List<String> topicIds = new ArrayList<>();
    private List<DigestSourceData> sources = new ArrayList<>();
}
