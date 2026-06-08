package com.verita.userservice.controller;

import com.verita.api.UsersApi;
import com.verita.api.AdminApi;
import com.verita.model.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.context.SecurityContextHolder;
import com.verita.userservice.service.UserService;
import com.verita.userservice.security.UserDetailsImpl;

@RestController
@RequiredArgsConstructor
public class UsersController implements UsersApi, AdminApi {
    private final UserService userService;

    private String getCurrentUsername() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) principal).getUsername();
        } else {
            return principal.toString();
        }
    }

    @Override
    public ResponseEntity<User> getUserByUsername(String username) {
        User user = userService.getByUsername(username);
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }

    @Override
    public ResponseEntity<Void> deleteCurrentUser() {
        userService.deleteUser(getCurrentUsername());
        return ResponseEntity.noContent().build();
    }

    @Override
    public ResponseEntity<User> getCurrentUser() {
        User user = userService.getByUsername(getCurrentUsername());
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }

    @Override
    public ResponseEntity<UserPreferences> getUserPreferences() {
        return ResponseEntity.ok(userService.getUserPreferences(getCurrentUsername()));
    }

    @Override
    public ResponseEntity<UserPreferences> updateUserPreferences(UserPreferences userPreferences) {
        userService.updateUserPreferences(getCurrentUsername(), userPreferences);
        return ResponseEntity.ok(userPreferences);
    }

    @Override
    public ResponseEntity<User> updateCurrentUser(UpdateUserRequest updateUserRequest) {
        return ResponseEntity.ok(userService.updateCurrentUser(getCurrentUsername(), updateUserRequest));
    }

    // Admin API implementations

    @Override
    public ResponseEntity<PaginatedUsers> listUsers(String q, Integer page, Integer size) {
        if (q != null && !q.isEmpty()) {
            return ResponseEntity.ok(userService.searchUsers(q, page != null ? page : 0, size != null ? size : 20));
        }
        return ResponseEntity.ok(userService.getUsers(page != null ? page : 0, size != null ? size : 20));
    }

    @Override
    public ResponseEntity<User> getUserById(UUID userId) {
        User user = userService.getById(userId);
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }

    @Override
    public ResponseEntity<User> updateUserRole(UUID userId, UpdateRoleRequest updateRoleRequest) {
        userService.updateUserRole(userId, updateRoleRequest);
        return ResponseEntity.ok(userService.getById(userId));
    }

    @Override
    public ResponseEntity<User> updateUserBanStatus(UUID userId, UpdateBanStatusRequest updateBanStatusRequest) {
        userService.updateUserBanStatus(userId, updateBanStatusRequest);
        return ResponseEntity.ok(userService.getById(userId));
    }
}
