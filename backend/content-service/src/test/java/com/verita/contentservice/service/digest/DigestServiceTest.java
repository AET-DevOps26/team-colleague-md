package com.verita.contentservice.service.digest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.verita.contentservice.client.UserClient;
import com.verita.contentservice.dto.UserProfileDto;
import com.verita.contentservice.entity.DigestEntity;
import com.verita.contentservice.mapper.DigestMapper;
import com.verita.contentservice.repository.DigestAssignmentRepository;
import com.verita.contentservice.repository.DigestRepository;
import com.verita.contentservice.security.SecurityUtils;
import com.verita.model.CreateDigestRequest;
import com.verita.model.DigestDetail;
import com.verita.model.DigestType;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DigestServiceTest {

    private static final UUID USER_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final LocalDate DIGEST_DATE = LocalDate.of(2026, 7, 16);

    @Mock private DigestRepository digestRepository;
    @Mock private DigestAssignmentRepository assignmentRepository;
    @Mock private DigestMapper digestMapper;
    @Mock private SecurityUtils securityUtils;
    @Mock private UserClient userClient;

    @InjectMocks private DigestService service;

    @Test
    void createDigest_usesDisplayNameAndDigestDateForPersonalTitle() {
        when(userClient.getUserById(USER_ID))
                .thenReturn(new UserProfileDto(USER_ID, "alexchen", "  Alex Chen  ", null, "USER", null));
        when(digestRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(digestMapper.toDetail(any())).thenReturn(new DigestDetail());

        service.createDigest(request(DigestType.PERSONAL, USER_ID, "Generated contextual title"));

        ArgumentCaptor<DigestEntity> saved = ArgumentCaptor.forClass(DigestEntity.class);
        verify(digestRepository).save(saved.capture());
        assertEquals("Alex Chen’s AI Digest — July 16, 2026", saved.getValue().getTitle());
    }

    @Test
    void createDigest_usesCommunityTitleForPublicDigest() {
        when(digestRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(digestMapper.toDetail(any())).thenReturn(new DigestDetail());

        service.createDigest(request(DigestType.PUBLIC, null, "Caller-supplied title"));

        ArgumentCaptor<DigestEntity> saved = ArgumentCaptor.forClass(DigestEntity.class);
        verify(digestRepository).save(saved.capture());
        assertEquals("Verita Community Digest — July 16, 2026", saved.getValue().getTitle());
    }

    @Test
    void createDigest_fallsBackWhenDisplayNameIsBlank() {
        when(userClient.getUserById(USER_ID))
                .thenReturn(new UserProfileDto(USER_ID, "alexchen", "   ", null, "USER", null));
        when(digestRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(digestMapper.toDetail(any())).thenReturn(new DigestDetail());

        service.createDigest(request(DigestType.PERSONAL, USER_ID, "Caller-supplied title"));

        ArgumentCaptor<DigestEntity> saved = ArgumentCaptor.forClass(DigestEntity.class);
        verify(digestRepository).save(saved.capture());
        assertEquals("Your AI Digest — July 16, 2026", saved.getValue().getTitle());
    }

    @Test
    void createDigest_fallsBackWhenProfileLookupFails() {
        when(userClient.getUserById(USER_ID)).thenThrow(new RuntimeException("user-service unavailable"));
        when(digestRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(digestMapper.toDetail(any())).thenReturn(new DigestDetail());

        service.createDigest(request(DigestType.PERSONAL, USER_ID, "Caller-supplied title"));

        ArgumentCaptor<DigestEntity> saved = ArgumentCaptor.forClass(DigestEntity.class);
        verify(digestRepository).save(saved.capture());
        assertEquals("Your AI Digest — July 16, 2026", saved.getValue().getTitle());
    }

    @Test
    void createDigest_fallsBackWhenPersonalTitleWouldExceedColumnLimit() {
        when(userClient.getUserById(USER_ID))
                .thenReturn(new UserProfileDto(USER_ID, "alexchen", "A".repeat(200), null, "USER", null));
        when(digestRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(digestMapper.toDetail(any())).thenReturn(new DigestDetail());

        service.createDigest(request(DigestType.PERSONAL, USER_ID, "Caller-supplied title"));

        ArgumentCaptor<DigestEntity> saved = ArgumentCaptor.forClass(DigestEntity.class);
        verify(digestRepository).save(saved.capture());
        assertEquals("Your AI Digest — July 16, 2026", saved.getValue().getTitle());
    }

    @Test
    void createDigest_countsTrimmedUnicodeCodePointsAgainstColumnLimit() {
        String displayName = "\u2003" + "😀".repeat(172) + "\u2003";
        when(userClient.getUserById(USER_ID))
                .thenReturn(new UserProfileDto(USER_ID, "alexchen", displayName, null, "USER", null));
        when(digestRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(digestMapper.toDetail(any())).thenReturn(new DigestDetail());

        service.createDigest(request(DigestType.PERSONAL, USER_ID, "Caller-supplied title"));

        ArgumentCaptor<DigestEntity> saved = ArgumentCaptor.forClass(DigestEntity.class);
        verify(digestRepository).save(saved.capture());
        assertEquals("😀".repeat(172) + "’s AI Digest — July 16, 2026", saved.getValue().getTitle());
    }

    private CreateDigestRequest request(DigestType type, UUID targetUserId, String callerTitle) {
        return new CreateDigestRequest()
                .digestType(type)
                .targetUserId(targetUserId)
                .digestDate(DIGEST_DATE)
                .title(callerTitle)
                .events(List.of())
                .topics(List.of());
    }
}
