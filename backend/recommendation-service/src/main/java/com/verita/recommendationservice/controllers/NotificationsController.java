package com.verita.recommendationservice.controllers;

import com.verita.api.NotificationsApi;
import com.verita.model.GetUserNotifications200Response;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.UUID;

@RestController
public class NotificationsController implements NotificationsApi {

    @Override
    public ResponseEntity<GetUserNotifications200Response> getUserNotifications(
            Boolean unreadOnly, Integer page, Integer size) {
        // TODO: Fetch paginated notifications for the authenticated user
        GetUserNotifications200Response response = new GetUserNotifications200Response()
                .content(new ArrayList<>())
                .page(page)
                .size(size)
                .totalPages(0)
                .totalElements(0L)
                .hasNext(false);
        return ResponseEntity.ok(response);
    }

    @Override
    public ResponseEntity<Void> markAllNotificationsRead() {
        // TODO: Mark all notifications as read for the authenticated user
        return ResponseEntity.ok().build();
    }

    @Override
    public ResponseEntity<Void> markNotificationRead(UUID id) {
        // TODO: Mark the specified notification as read
        return ResponseEntity.ok().build();
    }
}
