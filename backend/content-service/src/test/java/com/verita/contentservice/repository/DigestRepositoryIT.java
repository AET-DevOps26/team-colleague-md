package com.verita.contentservice.repository;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.verita.contentservice.TestcontainersConfiguration;
import com.verita.contentservice.entity.DigestEntity;
import com.verita.contentservice.entity.DigestTypeValue;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@ActiveProfiles("test")
@Import(TestcontainersConfiguration.class)
@Testcontainers(disabledWithoutDocker = true)
@Transactional
class DigestRepositoryIT {

    private static final UUID USER_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final UUID OTHER_USER_ID = UUID.fromString("22222222-2222-4222-8222-222222222222");

    @Autowired private DigestRepository digestRepository;
    @Autowired private DigestAssignmentRepository assignmentRepository;

    @BeforeEach
    void cleanDatabase() {
        assignmentRepository.deleteAll();
        digestRepository.deleteAll();
    }

    @Test
    void findHistoryForUser_selectsLatestCreatedDigestPerDay() {
        LocalDate duplicateDate = LocalDate.of(2026, 7, 15);
        LocalDate earlierDate = LocalDate.of(2026, 7, 13);

        personalDigest(USER_ID, duplicateDate, OffsetDateTime.parse("2026-07-15T13:46:24Z"));
        DigestEntity latest = personalDigest(
                USER_ID, duplicateDate, OffsetDateTime.parse("2026-07-15T18:30:50Z"));
        DigestEntity earlier = personalDigest(
                USER_ID, earlierDate, OffsetDateTime.parse("2026-07-13T21:41:53Z"));
        personalDigest(OTHER_USER_ID, duplicateDate, OffsetDateTime.parse("2026-07-15T20:00:00Z"));

        Page<DigestEntity> result = digestRepository.findHistoryForUser(USER_ID, PageRequest.of(0, 10));

        assertEquals(List.of(latest.getId(), earlier.getId()),
                result.getContent().stream().map(DigestEntity::getId).toList());
        assertEquals(2, result.getTotalElements());
    }

    private DigestEntity personalDigest(UUID userId, LocalDate digestDate, OffsetDateTime createdAt) {
        DigestEntity digest = new DigestEntity();
        digest.setDigestType(DigestTypeValue.PERSONAL);
        digest.setTargetUserId(userId);
        digest.setDigestDate(digestDate);
        digest.setTitle("Digest for " + digestDate + " at " + createdAt);
        digest.setEvents(List.of());
        digest.setTopics(List.of());
        digest.setEventCount(0);
        digest.setSourceCount(0);
        digest.setReadTimeMin(1);
        digest.setPreviewHeadlines(List.of());
        digest.setCreatedAt(createdAt);
        return digestRepository.saveAndFlush(digest);
    }
}
