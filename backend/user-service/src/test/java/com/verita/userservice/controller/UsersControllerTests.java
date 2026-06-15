package com.verita.userservice.controller;

import com.verita.model.UserRole;
import com.verita.userservice.repository.UserEntity;
import com.verita.userservice.security.JwtUtils;
import com.verita.userservice.security.UserDetailsImpl;
import com.verita.userservice.security.UserDetailsServiceImpl;
import com.verita.userservice.security.WebSecurityConfig;
import com.verita.userservice.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Import(WebSecurityConfig.class)
public class UsersControllerTests {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext context;

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
    }

    @Test
    void testGetCurrentUser_Authenticated_Returns200() throws Exception {
        com.verita.model.User user = new com.verita.model.User();
        user.setId(UUID.randomUUID());
        user.setUsername("testuser");
        user.setEmail("testuser@example.com");

        when(userService.getByUsername("testuser")).thenReturn(user);

        UserEntity userEntity = new UserEntity();
        userEntity.setId(user.getId());
        userEntity.setUsername("testuser");
        userEntity.setEmail("testuser@example.com");
        userEntity.setPassword("password");
        userEntity.setRole(UserRole.USER);

        UserDetailsImpl userDetails = UserDetailsImpl.build(userEntity);

        mockMvc.perform(get("/api/v1/users/me")
                .with(SecurityMockMvcRequestPostProcessors.user(userDetails))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("testuser"))
                .andExpect(jsonPath("$.email").value("testuser@example.com"));
    }

    @Test
    void testGetCurrentUser_Unauthenticated_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testListUsers_AsAdmin_Returns200() throws Exception {
        com.verita.model.PaginatedUsers paginatedUsers = new com.verita.model.PaginatedUsers();
        paginatedUsers.setTotalElements(0L);
        paginatedUsers.setTotalPages(0);

        when(userService.getUsers(anyInt(), anyInt())).thenReturn(paginatedUsers);

        UserEntity adminEntity = new UserEntity();
        adminEntity.setId(UUID.randomUUID());
        adminEntity.setUsername("admin");
        adminEntity.setEmail("admin@example.com");
        adminEntity.setPassword("password");
        adminEntity.setRole(UserRole.ADMIN);

        UserDetailsImpl adminDetails = UserDetailsImpl.build(adminEntity);

        mockMvc.perform(get("/api/v1/users")
                .with(SecurityMockMvcRequestPostProcessors.user(adminDetails))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk());
    }

    @Test
    void testListUsers_AsUser_Returns403() throws Exception {
        UserEntity userEntity = new UserEntity();
        userEntity.setId(UUID.randomUUID());
        userEntity.setUsername("testuser");
        userEntity.setEmail("testuser@example.com");
        userEntity.setPassword("password");
        userEntity.setRole(UserRole.USER);

        UserDetailsImpl userDetails = UserDetailsImpl.build(userEntity);

        mockMvc.perform(get("/api/v1/users")
                .with(SecurityMockMvcRequestPostProcessors.user(userDetails))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    void testGetCurrentUser_AuthenticatedButMissingUser_Returns404() throws Exception {
        UserEntity userEntity = new UserEntity();
        userEntity.setId(UUID.randomUUID());
        userEntity.setUsername("deleted-user");
        userEntity.setEmail("deleted@example.com");
        userEntity.setPassword("password");
        userEntity.setRole(UserRole.USER);

        UserDetailsImpl userDetails = UserDetailsImpl.build(userEntity);
        when(userService.getByUsername("deleted-user")).thenReturn(null);

        mockMvc.perform(get("/api/v1/users/me")
                .with(SecurityMockMvcRequestPostProcessors.user(userDetails))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void testUpdateCurrentUserAvatar_Authenticated_ReturnsUpdatedUser() throws Exception {
        com.verita.model.User user = new com.verita.model.User();
        user.setId(UUID.randomUUID());
        user.setUsername("testuser");
        user.setEmail("testuser@example.com");
        user.avatarUrl(java.net.URI.create("http://localhost:9000/verita-user-portraits/users/test/avatar.png"));

        when(userService.updateCurrentUserAvatar(any(), any())).thenReturn(user);

        UserEntity userEntity = new UserEntity();
        userEntity.setId(user.getId());
        userEntity.setUsername("testuser");
        userEntity.setEmail("testuser@example.com");
        userEntity.setPassword("password");
        userEntity.setRole(UserRole.USER);

        MockMultipartFile avatar = new MockMultipartFile("avatar", "avatar.png", "image/png", new byte[]{1, 2, 3});

        mockMvc.perform(multipart("/api/v1/users/me/avatar")
                .file(avatar)
                .with(request -> {
                    request.setMethod("PUT");
                    return request;
                })
                .with(SecurityMockMvcRequestPostProcessors.user(UserDetailsImpl.build(userEntity)))
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value("http://localhost:9000/verita-user-portraits/users/test/avatar.png"));

        verify(userService).updateCurrentUserAvatar(eq("testuser"), any());
    }

    @Test
    void testGetUserById_MissingUser_Returns404() throws Exception {
        when(userService.getById(any(UUID.class))).thenReturn(null);

        mockMvc.perform(get("/api/v1/users/{userId}", UUID.randomUUID())
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void testGetUserByUsername_ExistingUser_Returns200() throws Exception {
        com.verita.model.User user = new com.verita.model.User();
        user.setId(UUID.randomUUID());
        user.setUsername("alexchen");
        user.setEmail("alexchen@example.com");

        when(userService.getByUsername("alexchen")).thenReturn(user);

        mockMvc.perform(get("/api/v1/users/by-username/{username}", "alexchen")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("alexchen"));
    }

    @Test
    void testGetUserByUsername_MissingUser_Returns404() throws Exception {
        when(userService.getByUsername("nobody")).thenReturn(null);

        mockMvc.perform(get("/api/v1/users/by-username/{username}", "nobody")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void testGetUserByUsername_NoAuth_Returns200() throws Exception {
        com.verita.model.User user = new com.verita.model.User();
        user.setId(UUID.randomUUID());
        user.setUsername("publicuser");

        when(userService.getByUsername("publicuser")).thenReturn(user);

        // No authentication — endpoint must be public (security: [] in openapi spec)
        mockMvc.perform(get("/api/v1/users/by-username/{username}", "publicuser")
                .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("publicuser"));
    }
}
