package com.verita.userservice.controller;
import com.verita.api.UsersApi;
import com.verita.api.AdminApi;
import com.verita.model.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import com.verita.userservice.service.UserService;
import com.verita.userservice.security.UserDetailsImpl;

@RestController
public class UsersController implements UsersApi, AdminApi {
    @Autowired
    private UserService userService;
    private String getCurrentUsername() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserDetailsImpl) {
            return ((UserDetailsImpl) principal).getUsername();
        } else {
            return principal.toString();
        }
    }
    /**
     * DELETE /users/me : Delete current user
     *
     * @return Deleted successfully. (status code 204)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<Void> deleteCurrentUser() {
        userService.deleteUser(getCurrentUsername());
        return ResponseEntity.noContent().build();
    }
    /**
     * GET /users/me : Get current user
     *
     * @return Current user. (status code 200)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<User> getCurrentUser() {
        User user = userService.getByUsername(getCurrentUsername());
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.status(401).build();
    }
    /**
     * GET /users/me/preferences : Get user preferences
     *
     * @return User preferences. (status code 200)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<UserPreferences> getUserPreferences() {
        return ResponseEntity.ok(userService.getUserPreferences(getCurrentUsername()));
    }
    /**
     * PUT /users/me/preferences : Update user preferences
     *
     * @param userPreferences (required)
     * @return Updated preferences. (status code 200)
     * or Invalid request. (status code 400)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<UserPreferences> updateUserPreferences(UserPreferences userPreferences) {
        userService.updateUserPreferences(getCurrentUsername(), userPreferences);
        return ResponseEntity.ok(userPreferences);
    }
    /**
     * PATCH /users/me : Update current user
     *
     * @param updateUserRequest (required)
     * @return Updated user. (status code 200)
     * or Invalid request. (status code 400)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<User> updateCurrentUser(UpdateUserRequest updateUserRequest) {
        return ResponseEntity.ok(userService.updateCurrentUser(getCurrentUsername(), updateUserRequest));
    }
    // Admin API implementations
    /**
     * GET /admin/users : List users (admin)
     *
     * @param q (optional)
     * @param page (optional)
     * @param size (optional)
     * @return Users list. (status code 200)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<PaginatedUsers> listUsers(String q, Integer page, Integer size) {
        if (q != null && !q.isEmpty()) {
            return ResponseEntity.ok(userService.searchUsers(q, page != null ? page : 0, size != null ? size : 20));
        }
        return ResponseEntity.ok(userService.getUsers(page != null ? page : 0, size != null ? size : 20));
    }
    /**
     * GET /admin/users/{userId} : Get user by id (admin)
     *
     * @param userId (required)
     * @return User. (status code 200)
     * or Not Found. (status code 404)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<User> getUserById(UUID userId) {
        User user = userService.getById(userId);
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }
    /**
     * PATCH /admin/users/{userId}/role : Update user role (admin)
     *
     * @param userId (required)
     * @param updateRoleRequest (required)
     * @return Updated user. (status code 200)
     * or Invalid request. (status code 400)
     * or Not Found. (status code 404)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<User> updateUserRole(UUID userId, UpdateRoleRequest updateRoleRequest) {
        userService.updateUserRole(userId, updateRoleRequest);
        return ResponseEntity.ok(userService.getById(userId));
    }
    /**
     * PATCH /admin/users/{userId}/ban : Update user ban status (admin)
     *
     * @param userId (required)
     * @param updateBanStatusRequest (required)
     * @return Updated user. (status code 200)
     * or Invalid request. (status code 400)
     * or Not Found. (status code 404)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<User> updateUserBanStatus(UUID userId, UpdateBanStatusRequest updateBanStatusRequest) {
        userService.updateUserBanStatus(userId, updateBanStatusRequest);
        return ResponseEntity.ok(userService.getById(userId));
    }
}
