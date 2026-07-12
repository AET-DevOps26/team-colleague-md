package com.verita.userservice.service;
import com.verita.model.*;
import com.verita.userservice.entity.UserEntity;
import com.verita.userservice.exception.DeleteUserContentException;
import com.verita.userservice.exception.DeleteUserRecommendationException;
import com.verita.userservice.repository.UserRepository;
import com.verita.userservice.service.AvatarStorageService;
import com.verita.userservice.client.ContentServiceClient;
import com.verita.userservice.client.RecommendationServiceClient;
import com.verita.userservice.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
public class UserServiceTests {
    @Mock
    private UserRepository userRepository;
    @Mock
    private AvatarStorageService avatarStorageService;
    @Mock
    private ContentServiceClient contentServiceClient;
    @Mock
    private RecommendationServiceClient recommendationServiceClient;
    @InjectMocks
    private UserService userService;
    private UserEntity userEntity;
    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        userEntity = new UserEntity();
        userEntity.setId(UUID.randomUUID());
        userEntity.setUsername("testuser");
        userEntity.setEmail("test@test.com");
        userEntity.setRole(UserRole.USER);
    }
    @Test
    void getByUsername_success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        User result = userService.getByUsername("testuser");
        assertNotNull(result);
        assertEquals("testuser", result.getUsername());
    }
    @Test
    void getById_success() {
        when(userRepository.findById(userEntity.getId())).thenReturn(Optional.of(userEntity));
        User result = userService.getById(userEntity.getId());
        assertNotNull(result);
        assertEquals(userEntity.getId(), result.getId());
    }
    @Test
    void getById_includesAllProfileFields() {
        userEntity.setAvatarUrl("https://example.com/avatar.png");
        userEntity.setBio("Bio text");
        userEntity.setWebsite("https://example.com");
        userEntity.setOrganisation("Example Org");
        userEntity.setExpertiseAreas(List.of("java", "devops"));

        when(userRepository.findById(userEntity.getId())).thenReturn(Optional.of(userEntity));

        User result = userService.getById(userEntity.getId());

        assertNotNull(result);
        assertTrue(result.getAvatarUrl().isPresent());
        assertEquals("https://example.com/avatar.png", result.getAvatarUrl().get().toString());
        assertTrue(result.getBio().isPresent());
        assertEquals("Bio text", result.getBio().get());
        assertTrue(result.getWebsite().isPresent());
        assertEquals("https://example.com", result.getWebsite().get().toString());
        assertTrue(result.getOrganisation().isPresent());
        assertEquals("Example Org", result.getOrganisation().get());
        assertTrue(result.getExpertiseAreas().isPresent());
        assertEquals(List.of("java", "devops"), result.getExpertiseAreas().get());
    }

    @Test
    void getPreferencesById_success_returnsPrivacyFlags() {
        userEntity.setShowBookmarks(true);
        userEntity.setShowLikes(false);
        when(userRepository.findById(userEntity.getId())).thenReturn(Optional.of(userEntity));

        UserPreferences prefs = userService.getPreferencesById(userEntity.getId());

        assertTrue(prefs.getShowBookmarks());
        assertFalse(prefs.getShowLikes());
    }

    @Test
    void getPreferencesById_missing_throws404() {
        UUID missing = UUID.randomUUID();
        when(userRepository.findById(missing)).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class,
                () -> userService.getPreferencesById(missing));
        assertEquals(404, ex.getStatusCode().value());
    }

    @Test
    void updateCurrentUser_success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        UpdateUserRequest update = new UpdateUserRequest();
        update.setDisplayName("New Name");
        when(userRepository.save(any(UserEntity.class))).thenReturn(userEntity);
        User result = userService.updateCurrentUser("testuser", update);
        assertNotNull(result);
        assertEquals("New Name", result.getDisplayName());
        verify(userRepository, times(1)).save(any(UserEntity.class));
    }

    @Test
    void updateCurrentUserAvatar_successStoresUrlAndDeletesOldAvatar() {
        userEntity.setAvatarUrl("http://localhost:9000/verita-user-portraits/users/old/avatar-old.png");
        MockMultipartFile avatar = new MockMultipartFile("avatar", "avatar.png", "image/png", new byte[]{1, 2, 3});
        String newAvatarUrl = "http://localhost:9000/verita-user-portraits/users/new/avatar-new.png";

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        when(avatarStorageService.storeAvatar(eq(userEntity.getId()), same(avatar))).thenReturn(newAvatarUrl);
        when(userRepository.save(any(UserEntity.class))).thenReturn(userEntity);

        User result = userService.updateCurrentUserAvatar("testuser", avatar);

        assertTrue(result.getAvatarUrl().isPresent());
        assertEquals(newAvatarUrl, result.getAvatarUrl().get().toString());
        verify(userRepository, times(1)).save(userEntity);
        verify(avatarStorageService, times(1)).deleteAvatar("http://localhost:9000/verita-user-portraits/users/old/avatar-old.png");
    }

    @Test
    void updateCurrentUserAvatar_deletesNewAvatarWhenSaveFails() {
        MockMultipartFile avatar = new MockMultipartFile("avatar", "avatar.png", "image/png", new byte[]{1, 2, 3});
        String newAvatarUrl = "http://localhost:9000/verita-user-portraits/users/new/avatar-new.png";

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        when(avatarStorageService.storeAvatar(eq(userEntity.getId()), same(avatar))).thenReturn(newAvatarUrl);
        when(userRepository.save(any(UserEntity.class))).thenThrow(new RuntimeException("database unavailable"));

        assertThrows(RuntimeException.class, () -> userService.updateCurrentUserAvatar("testuser", avatar));

        verify(avatarStorageService, times(1)).deleteAvatar(newAvatarUrl);
    }

    @Test
    void deleteCurrentUserAvatar_successClearsUrlAndDeletesOldAvatar() {
        String oldAvatarUrl = "http://localhost:9000/verita-user-portraits/users/old/avatar-old.png";
        userEntity.setAvatarUrl(oldAvatarUrl);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        when(userRepository.save(any(UserEntity.class))).thenReturn(userEntity);

        User result = userService.deleteCurrentUserAvatar("testuser");

        assertNull(userEntity.getAvatarUrl());
        assertFalse(result.getAvatarUrl().isPresent());
        verify(userRepository, times(1)).save(userEntity);
        verify(avatarStorageService, times(1)).deleteAvatar(oldAvatarUrl);
    }

    @Test
    void deleteUser_success() {
        String avatarUrl = "http://localhost:9000/verita-user-portraits/users/old/avatar-old.png";
        userEntity.setAvatarUrl(avatarUrl);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        doNothing().when(userRepository).delete(any(UserEntity.class));

        userService.deleteUser("testuser");

        InOrder inOrder = inOrder(contentServiceClient, recommendationServiceClient, userRepository, avatarStorageService);
        inOrder.verify(contentServiceClient).deleteUserContentData(userEntity.getId());
        inOrder.verify(recommendationServiceClient).deleteUserRecommendationData(userEntity.getId());
        inOrder.verify(userRepository).delete(userEntity);
        inOrder.verify(avatarStorageService).deleteAvatar(avatarUrl);
    }

    @Test
    void deleteUser_whenContentCleanupFails_doesNotDeleteLocalUserOrAvatar() {
        String avatarUrl = "http://localhost:9000/verita-user-portraits/users/old/avatar-old.png";
        userEntity.setAvatarUrl(avatarUrl);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        doThrow(new DeleteUserContentException(
                userEntity.getId(),
                "content-service",
                "/internal/v1/users/{userId}/data",
                503,
                "cleanup unavailable",
                new RuntimeException("content cleanup unavailable")))
                .when(contentServiceClient).deleteUserContentData(userEntity.getId());

        assertThrows(DeleteUserContentException.class, () -> userService.deleteUser("testuser"));

        verify(recommendationServiceClient, never()).deleteUserRecommendationData(any());
        verify(userRepository, never()).delete(any(UserEntity.class));
        verify(avatarStorageService, never()).deleteAvatar(any());
    }

    @Test
    void deleteUser_whenRecommendationCleanupFails_doesNotDeleteLocalUserOrAvatar() {
        String avatarUrl = "http://localhost:9000/verita-user-portraits/users/old/avatar-old.png";
        userEntity.setAvatarUrl(avatarUrl);

        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        doThrow(new DeleteUserRecommendationException(
                userEntity.getId(),
                "recommendation-service",
                "/internal/v1/users/{userId}/data",
                503,
                "cleanup unavailable",
                new RuntimeException("recommendation cleanup unavailable")))
                .when(recommendationServiceClient).deleteUserRecommendationData(userEntity.getId());

        assertThrows(DeleteUserRecommendationException.class, () -> userService.deleteUser("testuser"));

        verify(contentServiceClient).deleteUserContentData(userEntity.getId());
        verify(userRepository, never()).delete(any(UserEntity.class));
        verify(avatarStorageService, never()).deleteAvatar(any());
    }

    @Test
    void searchUsers_success() {
        Page<UserEntity> page = new PageImpl<>(List.of(userEntity));
        when(userRepository.findByUsernameContainingIgnoreCaseOrDisplayNameContainingIgnoreCase(anyString(), anyString(), any(PageRequest.class)))
                .thenReturn(page);
        PaginatedUsers result = userService.searchUsers("test", 0, 10);
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
    }

    @Test
    void getUsers_success() {
        Page<UserEntity> page = new PageImpl<>(List.of(userEntity));
        when(userRepository.findAll(any(PageRequest.class))).thenReturn(page);
        PaginatedUsers result = userService.getUsers(0, 10);
        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals(1, result.getContent().size());
    }

    @Test
    void applyStatsDelta_nonZeroDeltas_appliesEach() {
        UUID id = userEntity.getId();
        userService.applyStatsDelta(id, 1, -2);
        verify(userRepository).applyPostCountDelta(id, 1);
        verify(userRepository).applyLikeReceivedCountDelta(id, -2);
    }

    @Test
    void applyStatsDelta_zeroDeltas_areNoOps() {
        userService.applyStatsDelta(userEntity.getId(), 0, 0);
        verify(userRepository, never()).applyPostCountDelta(any(), anyInt());
        verify(userRepository, never()).applyLikeReceivedCountDelta(any(), anyInt());
    }

    // ---- admin self-action guard (ADR-0020) ---------------------------------

    @Test
    void updateUserRole_otherUser_isApplied() {
        UserEntity target = new UserEntity();
        target.setId(UUID.randomUUID());
        target.setRole(UserRole.USER);
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));
        UpdateRoleRequest request = new UpdateRoleRequest();
        request.setRole(UserRole.VERIFIED);

        userService.updateUserRole(target.getId(), request, userEntity.getId());

        assertEquals(UserRole.VERIFIED, target.getRole());
        verify(userRepository).save(target);
    }

    @Test
    void updateUserRole_ownAccount_isRejected_soAdminsCannotDemoteThemselves() {
        UpdateRoleRequest request = new UpdateRoleRequest();
        request.setRole(UserRole.USER);

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> userService.updateUserRole(userEntity.getId(), request, userEntity.getId()));

        assertEquals(HttpStatus.FORBIDDEN, e.getStatusCode());
        verify(userRepository, never()).save(any());
    }

    @Test
    void updateUserBanStatus_otherUser_isApplied() {
        UserEntity target = new UserEntity();
        target.setId(UUID.randomUUID());
        when(userRepository.findById(target.getId())).thenReturn(Optional.of(target));
        UpdateBanStatusRequest request = new UpdateBanStatusRequest();
        request.setBanned(true);

        userService.updateUserBanStatus(target.getId(), request, userEntity.getId());

        assertTrue(target.getIsBanned());
        verify(userRepository).save(target);
    }

    @Test
    void updateUserBanStatus_ownAccount_isRejected_soAdminsCannotLockThemselvesOut() {
        UpdateBanStatusRequest request = new UpdateBanStatusRequest();
        request.setBanned(true);

        ResponseStatusException e = assertThrows(ResponseStatusException.class,
                () -> userService.updateUserBanStatus(userEntity.getId(), request, userEntity.getId()));

        assertEquals(HttpStatus.FORBIDDEN, e.getStatusCode());
        verify(userRepository, never()).save(any());
    }
}
