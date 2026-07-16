package com.verita.contentservice.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Topic reference (id + display name) stored inside the {@code topics} JSONB column. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class DigestTopicData {
    private String id;
    private String name;
}
