package com.verita.userservice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.verita.model.AuthResponse;
import com.verita.model.LoginRequest;
import com.verita.model.RegisterRequest;
import com.verita.userservice.exception.*;
import com.verita.userservice.security.AuthEntryPointJwt;
import com.verita.userservice.security.JwtUtils;
import com.verita.userservice.security.UserDetailsServiceImpl;
import com.verita.userservice.security.SecurityConfig;
import com.verita.userservice.service.AuthService;
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

import jakarta.servlet.http.Cookie;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Import(SecurityConfig.class)
public class AuthControllerTests {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext context;

    private ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private JwtUtils jwtUtils;

    @MockitoBean
    private UserDetailsServiceImpl userDetailsService;

    @MockitoBean
    private AuthEntryPointJwt authEntryPointJwt;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).build();
    }

    @Test
    void testLogin_ValidRequest_Returns200() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("testuser@example.com");
        loginRequest.setPassword("password123");

        AuthResponse authResponse = new AuthResponse();
        authResponse.setAccessToken("mocked-jwt-token");

        when(authService.login(any(LoginRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("mocked-jwt-token"));
    }

    @Test
    void testLogin_InvalidRequest_Returns400() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        // Missing required fields like username and password

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testRegister_ValidRequest_Returns201() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("newuser");
        registerRequest.setEmail("newuser@example.com");
        registerRequest.setPassword("TopSecret123!");

        AuthResponse authResponse = new AuthResponse();
        authResponse.setAccessToken("mocked-jwt-token-reg");

        when(authService.register(any(RegisterRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accessToken").value("mocked-jwt-token-reg"));
    }

    @Test
    void testRegister_InvalidRequest_Returns400() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        // Missing required fields

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void testLogin_BadCredentials_Returns401() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("testuser@example.com");
        loginRequest.setPassword("wrongpassword");

        when(authService.login(any(LoginRequest.class)))
            .thenThrow(new UserNotFoundException("testuser@example.com"));

        mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testCheckUsername_Available_ReturnsTrue() throws Exception {
        when(authService.checkUsernameAvailable("newuser")).thenReturn(true);

        mockMvc.perform(get("/api/v1/auth/check-username").param("username", "newuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true));
    }

    @Test
    void testCheckUsername_Taken_ReturnsFalse() throws Exception {
        when(authService.checkUsernameAvailable("takenuser")).thenReturn(false);

        mockMvc.perform(get("/api/v1/auth/check-username").param("username", "takenuser"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void testCheckEmail_Available_ReturnsTrue() throws Exception {
        when(authService.checkEmailAvailable("new@example.com")).thenReturn(true);

        mockMvc.perform(get("/api/v1/auth/check-email").param("email", "new@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true));
    }

    @Test
    void testCheckEmail_Taken_ReturnsFalse() throws Exception {
        when(authService.checkEmailAvailable("taken@example.com")).thenReturn(false);

        mockMvc.perform(get("/api/v1/auth/check-email").param("email", "taken@example.com"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false));
    }

    @Test
    void testRegister_DuplicateEmail_Returns409() throws Exception {
        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setUsername("newuser");
        registerRequest.setEmail("taken@example.com");
        registerRequest.setPassword("TopSecret123!");

        when(authService.register(any(RegisterRequest.class)))
            .thenThrow(new DuplicateEmailException("taken@example.com"));

        mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)))
                .andExpect(status().isConflict());
    }

    @Test
    void testRefresh_ValidCookie_Returns200AndRotatesCookie() throws Exception {
        AuthResponse authResponse = new AuthResponse();
        authResponse.setAccessToken("new-access-token");
        authResponse.setRefreshToken("new-refresh-uuid");

        when(authService.refreshToken("valid-refresh-uuid")).thenReturn(authResponse);

        mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")
                .cookie(new Cookie("refreshToken", "valid-refresh-uuid")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("new-access-token"))
                .andExpect(cookie().value("refreshToken", "new-refresh-uuid"));
    }

    @Test
    void testRefresh_InvalidToken_Returns401() throws Exception {
        when(authService.refreshToken(anyString()))
                .thenThrow(new InvalidRefreshTokenException());

        mockMvc.perform(post("/api/v1/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")
                .cookie(new Cookie("refreshToken", "bad-token")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testLogout_ClearsCookie() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout"))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("refreshToken", 0));

        verify(authService).logout(null);
    }
}
