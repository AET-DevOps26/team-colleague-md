package com.verita.userservice;
import com.verita.model.*;
import com.verita.userservice.repository.UserEntity;
import com.verita.userservice.repository.UserRepository;
import com.verita.userservice.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
public class UserServiceTests {
    @Mock
    private UserRepository userRepository;
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
    void deleteUser_success() {
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(userEntity));
        doNothing().when(userRepository).delete(any(UserEntity.class));
        userService.deleteUser("testuser");
        verify(userRepository, times(1)).delete(any(UserEntity.class));
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


