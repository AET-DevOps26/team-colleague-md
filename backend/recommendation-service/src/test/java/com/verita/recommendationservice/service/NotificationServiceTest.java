package com.verita.recommendationservice.service;

import com.verita.recommendationservice.entity.Notification;
import com.verita.recommendationservice.repository.NotificationRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationServiceTest {

    @Mock private NotificationRepository notificationRepository;
    @InjectMocks private NotificationService notificationService;

    private final UUID userId = UUID.randomUUID();
    private final UUID notificationId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void getNotifications_unreadOnly_usesUnreadQuery() {
        when(notificationRepository.findByUserIdAndIsRead(eq(userId), eq(false), any())).thenReturn(Page.empty());
        notificationService.getNotifications(userId, true, 0, 20);
        verify(notificationRepository).findByUserIdAndIsRead(eq(userId), eq(false), any());
    }

    @Test
    void getNotifications_all_usesUnfilteredQuery() {
        when(notificationRepository.findByUserId(eq(userId), any())).thenReturn(Page.empty());
        notificationService.getNotifications(userId, false, 0, 20);
        verify(notificationRepository).findByUserId(eq(userId), any());
    }

    @Test
    void markRead_owner_setsRead() {
        Notification n = mock(Notification.class);
        when(n.getUserId()).thenReturn(userId);
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(n));
        notificationService.markRead(notificationId, userId);
        verify(n).setRead(true);
    }

    @Test
    void markRead_missing_throws404() {
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.empty());
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> notificationService.markRead(notificationId, userId));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void markRead_otherUsersNotification_throws404() {
        Notification n = mock(Notification.class);
        when(n.getUserId()).thenReturn(UUID.randomUUID());
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(n));
        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> notificationService.markRead(notificationId, userId));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void markAllRead_delegatesToRepository() {
        notificationService.markAllRead(userId);
        verify(notificationRepository).markAllReadByUserId(userId);
    }
}
