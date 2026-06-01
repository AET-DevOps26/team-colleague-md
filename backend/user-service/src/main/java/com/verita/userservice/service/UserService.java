package com.verita.userservice.service;

import com.verita.model.*;
import com.verita.userservice.repository.UserEntity;
import com.verita.userservice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;

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
        if (request.getAvatarUrl() != null && request.getAvatarUrl().isPresent()) {
            URI avatarUrl = request.getAvatarUrl().get();
            user.setAvatarUrl(avatarUrl != null ? avatarUrl.toString() : null);
        }

        userRepository.save(user);
        return mapToDto(user);
    }

    public void deleteUser(String username) {
        userRepository.findByUsername(username).ifPresent(userRepository::delete);
    }

    public UserPreferences getUserPreferences(String username) {
        UserEntity user = userRepository.findByUsername(username).orElseThrow();
        UserPreferences prefs = new UserPreferences();
        prefs.setDigestFrequency(user.getDigestFrequency());
        prefs.setShowBookmarks(user.getShowBookmarks());
        prefs.setShowLikes(user.getShowLikes());
        return prefs;
    }

    public void updateUserPreferences(String username, UserPreferences prefs) {
        UserEntity user = userRepository.findByUsername(username).orElseThrow();
        if (prefs.getDigestFrequency() != null) user.setDigestFrequency(prefs.getDigestFrequency());
        if (prefs.getShowBookmarks() != null) user.setShowBookmarks(prefs.getShowBookmarks());
        if (prefs.getShowLikes() != null) user.setShowLikes(prefs.getShowLikes());
        userRepository.save(user);
    }

    public PaginatedUsers searchUsers(String query, int page, int size) {
        Page<UserEntity> entityPage = userRepository.findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(query, query, PageRequest.of(page, size));
        return buildPaginatedUsers(entityPage);
    }

    public PaginatedUsers getUsers(int page, int size) {
        Page<UserEntity> entityPage = userRepository.findAll(PageRequest.of(page, size));
        return buildPaginatedUsers(entityPage);
    }

    private PaginatedUsers buildPaginatedUsers(Page<UserEntity> entityPage) {
        List<User> list = entityPage.getContent().stream().map(this::mapToDto).collect(Collectors.toList());
        PaginatedUsers result = new PaginatedUsers();
        result.setContent(list);
        result.setTotalElements(entityPage.getTotalElements());
        result.setTotalPages(entityPage.getTotalPages());
        result.setPage(entityPage.getNumber());
        result.setSize(entityPage.getSize());
        return result;
    }

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
            if(updatedRole != null){
                 entity.setRole(updatedRole);
            }
        }

        userRepository.save(entity);
    }

    public void updateUserBanStatus(UUID userId, UpdateBanStatusRequest updateBanStatusRequest) {
        UserEntity entity = userRepository.findById(userId).orElseThrow();
        if (updateBanStatusRequest.getBanned() != null) {
            entity.setIsBanned(updateBanStatusRequest.getBanned());
        }
        userRepository.save(entity);
    }

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

        dto.setFollowerCount(entity.getFollowerCount());
        dto.setFollowingCount(entity.getFollowingCount());
        dto.setPostCount(entity.getPostCount());
        dto.setLikeReceivedCount(entity.getLikeReceivedCount());

        return dto;
    }
}



