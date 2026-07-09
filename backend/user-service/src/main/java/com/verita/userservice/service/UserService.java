package com.verita.userservice.service;

import com.verita.model.*;
import com.verita.userservice.client.ContentServiceClient;
import com.verita.userservice.client.RecommendationServiceClient;
import com.verita.userservice.entity.UserEntity;
import com.verita.userservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.openapitools.jackson.nullable.JsonNullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for reading and mutating user profiles, preferences, and administrative actions.
 * All methods operate on the caller-supplied username or user ID; access control is
 * enforced at the controller layer via Spring Security.
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final AvatarStorageService avatarStorageService;
    private final ContentServiceClient contentServiceClient;
    private final RecommendationServiceClient recommendationServiceClient;

    public User getByUsername(String username) {
        return userRepository.findByUsername(username)
                .map(this::mapToDto)
                .orElse(null);
    }

    public User getById(UUID id) {
        return userRepository.findById(id)
                .map(this::mapToDto)
                .orElse(null);
    }

    /**
     * Applies a partial update to the currently authenticated user's profile.
     * Only non-null fields in the request are applied; absent fields are left unchanged.
     *
     * @param username the username of the user to update (resolved from the security context)
     * @param request  the fields to update
     * @return the updated {@link User} DTO
     */
    public User updateCurrentUser(String username, UpdateUserRequest request) {
        UserEntity user = userRepository.findByUsername(username).orElseThrow();
        if (request.getDisplayName() != null) user.setDisplayName(request.getDisplayName());

        if (request.getBio() != null && request.getBio().isPresent()) {
            user.setBio(request.getBio().get());
        }
        if (request.getWebsite() != null && request.getWebsite().isPresent()) {
            URI website = request.getWebsite().get();
            user.setWebsite(website != null ? website.toString() : null);
        }
        if (request.getOrganisation() != null && request.getOrganisation().isPresent()) {
            user.setOrganisation(request.getOrganisation().get());
        }
        if (request.getExpertiseAreas() != null && request.getExpertiseAreas().isPresent()) {
            List<String> areas = request.getExpertiseAreas().get();
            // Copy into a mutable list: Hibernate manages this @ElementCollection in place
            // and a null clears it.
            user.setExpertiseAreas(areas == null ? new ArrayList<>() : new ArrayList<>(areas));
        }
        userRepository.save(user);
        return mapToDto(user);
    }

    public User updateCurrentUserAvatar(String username, MultipartFile avatar) {
        UserEntity user = userRepository.findByUsername(username).orElseThrow();
        String previousAvatarUrl = user.getAvatarUrl();
        String newAvatarUrl = avatarStorageService.storeAvatar(user.getId(), avatar);

        user.setAvatarUrl(newAvatarUrl);
        try {
            userRepository.save(user);
        } catch (RuntimeException ex) {
            avatarStorageService.deleteAvatar(newAvatarUrl);
            throw ex;
        }

        avatarStorageService.deleteAvatar(previousAvatarUrl);
        return mapToDto(user);
    }

    public User deleteCurrentUserAvatar(String username) {
        UserEntity user = userRepository.findByUsername(username).orElseThrow();
        String previousAvatarUrl = user.getAvatarUrl();

        user.setAvatarUrl(null);
        userRepository.save(user);
        avatarStorageService.deleteAvatar(previousAvatarUrl);

        return mapToDto(user);
    }

    /**
     * Deletes the user account for the given username. No-op if the user does not exist.
     * Downstream content/recommendation cleanup runs first (fail-closed: a downstream failure
     * aborts the local delete) and authenticates service-to-service via the internal token —
     * the caller's user JWT is never threaded through (ADR-0006/0007).
     *
     * @param username the username of the account to delete
     */
    public void deleteUser(String username) {
        userRepository.findByUsername(username).ifPresent(user -> {
            String avatarUrl = user.getAvatarUrl();
            contentServiceClient.deleteUserContentData(user.getId());
            recommendationServiceClient.deleteUserRecommendationData(user.getId());
            userRepository.delete(user);
            avatarStorageService.deleteAvatar(avatarUrl);
        });
    }

    public UserPreferences getUserPreferences(String username) {
        UserEntity user = userRepository.findByUsername(username).orElseThrow();
        return toPreferences(user);
    }

    /**
     * Reads another user's preferences by id for the internal cross-service privacy check
     * (content-service enforces the bookmark/like visibility toggles). Caller is authenticated
     * as a service via the internal token (ADR-0007), not as the target user.
     *
     * @throws UserNotFoundException if no user exists with the given id
     */
    public UserPreferences getPreferencesById(UUID userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return toPreferences(user);
    }

    private UserPreferences toPreferences(UserEntity user) {
        UserPreferences prefs = new UserPreferences();
        prefs.setDigestFrequency(user.getDigestFrequency());
        prefs.setShowBookmarks(user.getShowBookmarks());
        prefs.setShowLikes(user.getShowLikes());
        return prefs;
    }

    /**
     * Updates notification and privacy preferences for the given user.
     * Only non-null fields in {@code prefs} are applied.
     *
     * @param username the username whose preferences to update
     * @param prefs    the preference fields to apply
     */
    public void updateUserPreferences(String username, UserPreferences prefs) {
        UserEntity user = userRepository.findByUsername(username).orElseThrow();
        if (prefs.getDigestFrequency() != null) user.setDigestFrequency(prefs.getDigestFrequency());
        if (prefs.getShowBookmarks() != null) user.setShowBookmarks(prefs.getShowBookmarks());
        if (prefs.getShowLikes() != null) user.setShowLikes(prefs.getShowLikes());
        userRepository.save(user);
    }

    /**
     * Searches users whose username or display name contains the given query string
     * (case-insensitive) and returns a paginated result.
     *
     * @param query the search term
     * @param page  zero-based page index
     * @param size  number of results per page
     * @return a {@link PaginatedUsers} containing the matching users and pagination metadata
     */
    public PaginatedUsers searchUsers(String query, int page, int size) {
        Page<UserEntity> entityPage = userRepository
                .findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(
                        query, query, PageRequest.of(page, size));
        return buildPaginatedUsers(entityPage);
    }

    public PaginatedUsers getUsers(int page, int size) {
        Page<UserEntity> entityPage = userRepository.findAll(PageRequest.of(page, size));
        return buildPaginatedUsers(entityPage);
    }

    public PaginatedDigestRecipients getDigestRecipients(DigestFrequency frequency, int page, int size) {
        Page<UserEntity> entityPage = userRepository.findByDigestFrequency(frequency, PageRequest.of(page, size));
        PaginatedDigestRecipients result = new PaginatedDigestRecipients();
        result.setContent(entityPage.getContent().stream()
                .map(user -> new DigestRecipient(user.getId()))
                .toList());
        result.setPage(entityPage.getNumber());
        result.setSize(entityPage.getSize());
        result.setTotalPages(entityPage.getTotalPages());
        result.setTotalElements(entityPage.getTotalElements());
        result.setHasNext(entityPage.hasNext());
        return result;
    }

    /**
     * Updates the role of a user. Only recognised role values are applied;
     * unrecognised values are silently ignored.
     *
     * @param userId            the UUID of the user to update
     * @param updateRoleRequest the new role
     */
    public void updateUserRole(UUID userId, UpdateRoleRequest updateRoleRequest) {
        UserEntity entity = userRepository.findById(userId).orElseThrow();

        if (updateRoleRequest.getRole() != null) {
            UserRole updatedRole = null;
            if (updateRoleRequest.getRole().name().equals("ADMIN")) {
                updatedRole = UserRole.ADMIN;
            } else if (updateRoleRequest.getRole().name().equals("USER")) {
                updatedRole = UserRole.USER;
            } else if (updateRoleRequest.getRole().name().equals("VERIFIED")) {
                updatedRole = UserRole.VERIFIED;
            }
            if (updatedRole != null) {
                entity.setRole(updatedRole);
            }
        }

        userRepository.save(entity);
    }

    /**
     * Applies signed deltas to an author's cached aggregate counts, called by content-service on
     * publish/unpublish and like/unlike events (ADR-0007 write-back). Zero deltas are skipped and an
     * unknown user ID is a silent no-op — the caller treats this as best-effort so a lost update only
     * causes count drift, never a failed post/like. Counts are clamped at zero in the repository.
     * TODO(#178): follower/following deltas are intentionally not accepted yet.
     */
    @org.springframework.transaction.annotation.Transactional
    public void applyStatsDelta(UUID userId, int postCountDelta, int likeReceivedCountDelta) {
        if (postCountDelta != 0) userRepository.applyPostCountDelta(userId, postCountDelta);
        if (likeReceivedCountDelta != 0) userRepository.applyLikeReceivedCountDelta(userId, likeReceivedCountDelta);
    }

    public void updateUserBanStatus(UUID userId, UpdateBanStatusRequest updateBanStatusRequest) {
        UserEntity entity = userRepository.findById(userId).orElseThrow();
        if (updateBanStatusRequest.getBanned() != null) {
            entity.setIsBanned(updateBanStatusRequest.getBanned());
        }
        userRepository.save(entity);
    }

    // --- Private helpers ---

    private PaginatedUsers buildPaginatedUsers(Page<UserEntity> entityPage) {
        List<User> list = entityPage.getContent().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
        PaginatedUsers result = new PaginatedUsers();
        result.setContent(list);
        result.setTotalElements(entityPage.getTotalElements());
        result.setTotalPages(entityPage.getTotalPages());
        result.setPage(entityPage.getNumber());
        result.setSize(entityPage.getSize());
        return result;
    }

    /**
     * Maps a {@link UserEntity} to the OpenAPI-generated {@link User} DTO.
     * All optional profile fields are wrapped in {@link org.openapitools.jackson.nullable.JsonNullable}
     * to correctly express "field present but null" vs "field absent" in PATCH responses.
     *
     * @param entity the persisted user entity
     * @return the fully populated {@link User} DTO
     */
    private User mapToDto(UserEntity entity) {
        User dto = new User();
        dto.setId(entity.getId());
        dto.setUsername(entity.getUsername());
        dto.setDisplayName(entity.getDisplayName());
        dto.setEmail(entity.getEmail());
        dto.setRole(entity.getRole());
        dto.setIsBanned(entity.getIsBanned());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());

        dto.setAvatarUrl(toJsonNullableUri(entity.getAvatarUrl()));
        dto.setBio(toJsonNullableString(entity.getBio()));
        dto.setWebsite(toJsonNullableUri(entity.getWebsite()));
        dto.setOrganisation(toJsonNullableString(entity.getOrganisation()));
        dto.setExpertiseAreas(toJsonNullableList(entity.getExpertiseAreas()));

        dto.setFollowerCount(entity.getFollowerCount());
        dto.setFollowingCount(entity.getFollowingCount());
        dto.setPostCount(entity.getPostCount());
        dto.setLikeReceivedCount(entity.getLikeReceivedCount());

        return dto;
    }

    private JsonNullable<URI> toJsonNullableUri(String value) {
        return (value == null || value.isBlank())
                ? JsonNullable.undefined()
                : JsonNullable.of(URI.create(value));
    }

    private JsonNullable<String> toJsonNullableString(String value) {
        return value == null ? JsonNullable.undefined() : JsonNullable.of(value);
    }

    private JsonNullable<List<String>> toJsonNullableList(List<String> values) {
        return values == null ? JsonNullable.undefined() : JsonNullable.of(new ArrayList<>(values));
    }
}
