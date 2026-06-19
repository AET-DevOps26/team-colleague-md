package com.verita.userservice;
import com.verita.model.*;
import com.verita.userservice.exception.DeleteUserContentException;
import com.verita.userservice.repository.UserEntity;
import com.verita.userservice.repository.UserRepository;
import com.verita.userservice.service.AvatarStorageService;
import com.verita.userservice.service.ContentServiceClient;
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

        userService.deleteUser("testuser", "Bearer token");

        InOrder inOrder = inOrder(contentServiceClient, userRepository, avatarStorageService);
        inOrder.verify(contentServiceClient).deleteUserContentData(userEntity.getId(), "Bearer token");
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
                .when(contentServiceClient).deleteUserContentData(userEntity.getId(), "Bearer token");

        assertThrows(DeleteUserContentException.class, () -> userService.deleteUser("testuser", "Bearer token"));

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
}
