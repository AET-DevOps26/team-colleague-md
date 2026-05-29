package com.verita.userservice.controller;

import com.verita.model.DigestFrequency;
import com.verita.model.UserRole;
import com.verita.userservice.repository.UserEntity;
import com.verita.userservice.repository.UserRepository;
import com.verita.userservice.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("integration-test")
@Testcontainers
class UserEndpointIntegrationTests {

    @Container
    static final PostgreSQLContainer<?> userDb = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("verita_users_test")
            .withUsername("verita_user")
            .withPassword("verita_password");

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @DynamicPropertySource
    static void configurePostgres(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", userDb::getJdbcUrl);
        registry.add("spring.datasource.username", userDb::getUsername);
        registry.add("spring.datasource.password", userDb::getPassword);
        registry.add("spring.datasource.driver-class-name", userDb::getDriverClassName);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
    }

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        userRepository.deleteAll();
    }

    @Test
    void registerEndpointPersistsUserRecord() throws Exception {
        String request = """
                {
                  "username": "newuser",
                  "email": "newuser@example.com",
                  "password": "TopSecret123!"
                }
                """;

        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").isString());

        UserEntity savedUser = userRepository.findByUsername("newuser").orElseThrow();
        assertNotNull(savedUser.getId());
        assertEquals("newuser@example.com", savedUser.getEmail());
        assertEquals("newuser", savedUser.getDisplayName());
        assertEquals(UserRole.USER, savedUser.getRole());
        assertNotEquals("TopSecret123!", savedUser.getPassword());
        assertTrue(passwordEncoder.matches("TopSecret123!", savedUser.getPassword()));
    }

    @Test
    void updateCurrentUserEndpointPersistsProfileChanges() throws Exception {
        UserEntity user = saveUser("profileuser", "profile@example.com", UserRole.USER);

        String request = """
                {
                  "displayName": "Updated Profile"
                }
                """;

        mockMvc.perform(put("/api/v1/users/me")
                        .with(user(UserDetailsImpl.build(user)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName").value("Updated Profile"));

        UserEntity updatedUser = userRepository.findById(user.getId()).orElseThrow();
        assertEquals("Updated Profile", updatedUser.getDisplayName());
        assertNotNull(updatedUser.getUpdatedAt());
    }

    @Test
    void updatePreferencesEndpointPersistsPreferenceChanges() throws Exception {
        UserEntity user = saveUser("prefsuser", "prefs@example.com", UserRole.USER);

        String request = """
                {
                  "digestFrequency": "DAILY",
                  "showBookmarks": false,
                  "showLikes": true
                }
                """;

        mockMvc.perform(put("/api/v1/users/me/preferences")
                        .with(user(UserDetailsImpl.build(user)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(request))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.digestFrequency").value("DAILY"))
                .andExpect(jsonPath("$.showBookmarks").value(false));

        UserEntity updatedUser = userRepository.findById(user.getId()).orElseThrow();
        assertEquals(DigestFrequency.DAILY, updatedUser.getDigestFrequency());
        assertFalse(updatedUser.getShowBookmarks());
    }

    @Test
    void deleteCurrentUserEndpointRemovesUserRecord() throws Exception {
        UserEntity user = saveUser("deleteuser", "delete@example.com", UserRole.USER);

        mockMvc.perform(delete("/api/v1/users/me")
                        .with(user(UserDetailsImpl.build(user))))
                .andExpect(status().isNoContent());

        assertFalse(userRepository.existsById(user.getId()));
    }

    @Test
    void adminEndpointsPersistRoleAndBanChanges() throws Exception {
        UserEntity admin = saveUser("admin", "admin@example.com", UserRole.ADMIN);
        UserEntity target = saveUser("target", "target@example.com", UserRole.USER);

        mockMvc.perform(patch("/api/v1/users/{userId}/role", target.getId())
                        .with(user(UserDetailsImpl.build(admin)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role": "VERIFIED"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("VERIFIED"));

        UserEntity roleUpdatedUser = userRepository.findById(target.getId()).orElseThrow();
        assertEquals(UserRole.VERIFIED, roleUpdatedUser.getRole());

        mockMvc.perform(patch("/api/v1/users/{userId}/ban", target.getId())
                        .with(user(UserDetailsImpl.build(admin)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "banned": true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isBanned").value(true));

        UserEntity bannedUser = userRepository.findById(target.getId()).orElseThrow();
        assertTrue(bannedUser.getIsBanned());
    }

    private UserEntity saveUser(String username, String email, UserRole role) {
        UserEntity user = new UserEntity();
        user.setUsername(username);
        user.setDisplayName(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode("Password123!"));
        user.setRole(role);
        return userRepository.save(user);
    }
}
