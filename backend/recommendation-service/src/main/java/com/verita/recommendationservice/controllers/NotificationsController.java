package com.verita.recommendationservice.controllers;

import com.verita.api.NotificationsApi;
import com.verita.model.GetUserNotifications200Response;
import com.verita.model.NotificationResponse;
import com.verita.recommendationservice.entities.Notification;
import com.verita.recommendationservice.security.SecurityUtils;
import com.verita.recommendationservice.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@Validated
@RestController
public class NotificationsController implements NotificationsApi {

    private final SecurityUtils securityUtils;
    private final NotificationService notificationService;

    public NotificationsController(SecurityUtils securityUtils, NotificationService notificationService) {
        this.securityUtils = securityUtils;
        this.notificationService = notificationService;
    }

    @Override
    public ResponseEntity<GetUserNotifications200Response> getUserNotifications(
            Boolean unreadOnly, Integer page, Integer size) {
        UUID userId = securityUtils.getCurrentUserId();
        var notifPage = notificationService.getNotifications(
                userId, Boolean.TRUE.equals(unreadOnly), page, size);

        List<NotificationResponse> content = notifPage.getContent().stream()
                .map(this::toDto)
                .toList();

        GetUserNotifications200Response response = new GetUserNotifications200Response()
                .content(content)
                .page(notifPage.getNumber())
                .size(notifPage.getSize())
                .totalPages(notifPage.getTotalPages())
                .totalElements(notifPage.getTotalElements())
                .hasNext(notifPage.hasNext());

        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<Void> markAllNotificationsRead() {
        notificationService.markAllRead(securityUtils.getCurrentUserId());
        return ResponseEntity.ok().build();
    }

    @Override
    public ResponseEntity<Void> markNotificationRead(UUID id) {
        notificationService.markRead(id, securityUtils.getCurrentUserId());
        return ResponseEntity.ok().build();
    }

    private NotificationResponse toDto(Notification n) {
        return new NotificationResponse()
                .id(n.getId())
                .type(NotificationResponse.TypeEnum.fromValue(n.getType()))
                .content(n.getContent())
                .relatedPostId(n.getRelatedPostId())
                .isRead(n.isRead())
                .createdAt(n.getCreatedAt());
    }
}
