package com.verita.recommendationservice.service;

import com.verita.recommendationservice.entity.Notification;
import com.verita.recommendationservice.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public Page<Notification> getNotifications(UUID userId, boolean unreadOnly, int page, int size) {
        var pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        return unreadOnly
                ? notificationRepository.findByUserIdAndIsRead(userId, false, pageable)
                : notificationRepository.findByUserId(userId, pageable);
    }

    @Transactional
    public void markRead(UUID notificationId, UUID currentUserId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!notification.getUserId().equals(currentUserId)) {
            // 404 instead of 403 — avoids leaking whether the notification exists for another user
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found");
        }
        notification.setRead(true);
    }

    @Transactional
    public void markAllRead(UUID userId) {
        notificationRepository.markAllReadByUserId(userId);
    }
}
