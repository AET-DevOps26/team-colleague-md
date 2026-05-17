package com.verita.userservice.controller;

import com.verita.api.UsersApi;
import com.verita.model.*;
import org.jspecify.annotations.Nullable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class UsersController implements UsersApi {


    /**
     * DELETE /users/me : Delete current user account
     *
     * @return Account deleted. (status code 204)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<Void> deleteCurrentUser() {
        return null;
    }

    /**
     * GET /users/me : Get current user profile
     *
     * @return Current user profile. (status code 200)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<User> getCurrentUser() {
        return null;
    }

    /**
     * GET /users/me/sessions : Get active sessions
     *
     * @return Active sessions. (status code 200)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<List<Session>> getSessions() {
        return null;
    }

    /**
     * GET /users/{userId} : Get user by ID
     *
     * @param userId (required)
     * @return User found. (status code 200)
     * or Unauthorized. (status code 401)
     * or Not Found. (status code 404)
     */
    @Override
    public ResponseEntity<User> getUserById(UUID userId) {
        return null;
    }

    /**
     * GET /users/me/preferences : Get user preferences
     *
     * @return User preferences. (status code 200)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<UserPreferences> getUserPreferences() {
        return null;
    }

    /**
     * GET /users/{userId}/roles : Get user roles
     *
     * @param userId (required)
     * @return User roles. (status code 200)
     * or Unauthorized. (status code 401)
     * or Not Found. (status code 404)
     */
    @Override
    public ResponseEntity<List<Role>> getUserRoles(UUID userId) {
        return null;
    }

    /**
     * GET /users : Get paginated list of users
     *
     * @param page (optional, default to 0)
     * @param size (optional, default to 20)
     * @param sort (optional)
     * @return Paginated users. (status code 200)
     * or Unauthorized. (status code 401)
     * or Forbidden. (status code 403)
     */
    @Override
    public ResponseEntity<PaginatedUsers> getUsers(Integer page, Integer size, @Nullable String sort) {
        return null;
    }

    /**
     * GET /users/{userId}/verification-status : Get verification status
     *
     * @param userId (required)
     * @return Verification status. (status code 200)
     * or Unauthorized. (status code 401)
     * or Not Found. (status code 404)
     */
    @Override
    public ResponseEntity<VerificationStatus> getVerificationStatus(UUID userId) {
        return null;
    }

    /**
     * DELETE /users/me/sessions/{sessionId} : Revoke session
     *
     * @param sessionId (required)
     * @return Session revoked. (status code 204)
     * or Unauthorized. (status code 401)
     * or Not Found. (status code 404)
     */
    @Override
    public ResponseEntity<Void> revokeSession(String sessionId) {
        return null;
    }

    /**
     * GET /users/search : Search users
     *
     * @param q    (required)
     * @param page (optional, default to 0)
     * @param size (optional, default to 20)
     * @return Search results. (status code 200)
     * or Invalid request. (status code 400)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<PaginatedUsers> searchUsers(String q, Integer page, Integer size) {
        return null;
    }

    /**
     * PUT /users/me : Update current user profile
     *
     * @param updateUserRequest (required)
     * @return User updated successfully. (status code 200)
     * or Invalid request. (status code 400)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<User> updateCurrentUser(UpdateUserRequest updateUserRequest) {
        return null;
    }

    /**
     * PUT /users/me/preferences : Update user preferences
     *
     * @param userPreferences (required)
     * @return Preferences updated. (status code 200)
     * or Invalid request. (status code 400)
     * or Unauthorized. (status code 401)
     */
    @Override
    public ResponseEntity<Void> updateUserPreferences(UserPreferences userPreferences) {
        return null;
    }

    /**
     * PUT /users/{userId}/roles : Update user roles
     *
     * @param userId             (required)
     * @param updateRolesRequest (required)
     * @return Roles updated. (status code 200)
     * or Invalid request. (status code 400)
     * or Unauthorized. (status code 401)
     * or Forbidden. (status code 403)
     * or Not Found. (status code 404)
     */
    @Override
    public ResponseEntity<Void> updateUserRoles(UUID userId, UpdateRolesRequest updateRolesRequest) {
        return null;
    }
}