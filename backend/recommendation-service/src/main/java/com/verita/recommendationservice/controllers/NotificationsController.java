package com.verita.recommendationservice.controllers;

import com.verita.api.NotificationsApi;
import com.verita.model.GetUserNotifications200Response;
import com.verita.recommendationservice.security.SecurityUtils;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.UUID;

@Validated
@RestController
public class NotificationsController implements NotificationsApi {

    private final SecurityUtils securityUtils;

    public NotificationsController(SecurityUtils securityUtils) {
        this.securityUtils = securityUtils;
    }

    @Override
    public ResponseEntity<GetUserNotifications200Response> getUserNotifications(
            Boolean unreadOnly, Integer page, Integer size) {
        // TODO: Fetch paginated notifications for the authenticated user.
        // Use securityUtils.getCurrentUserId() as the filter — never trust a userId from the request.
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
        // TODO: Mark all notifications as read for the authenticated user.
        // Pass securityUtils.getCurrentUserId() directly to the repository — no entity ownership check needed
        // because the query is scoped to that userId by construction.
        return ResponseEntity.ok().build();
    }

    @Override
    public ResponseEntity<Void> markNotificationRead(UUID id) {
        // TODO: Mark the specified notification as read.
        // Load the Notification by id, then verify entity.getUserId().equals(securityUtils.getCurrentUserId())
        // before persisting changes — return 403 or 404 if the check fails.
        return ResponseEntity.ok().build();
    }
}
