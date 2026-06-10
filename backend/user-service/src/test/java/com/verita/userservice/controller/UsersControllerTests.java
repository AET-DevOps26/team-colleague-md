package com.verita.userservice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.verita.model.User;
import com.verita.userservice.security.AuthEntryPointJwt;
import com.verita.userservice.security.JwtUtils;
import com.verita.userservice.security.UserDetailsServiceImpl;
import com.verita.userservice.security.WebSecurityConfig;
import com.verita.userservice.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.Collections;
import java.util.UUID;
import com.verita.userservice.security.UserDetailsImpl;
import com.verita.userservice.repository.UserEntity;
import com.verita.model.UserRole;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;

@SpringBootTest
@ActiveProfiles("test")
@Import(WebSecurityConfig.class)
public class UsersControllerTests {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext context;

    private ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private UserService userService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private AuthEntryPointJwt authEntryPointJwt;

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
}
