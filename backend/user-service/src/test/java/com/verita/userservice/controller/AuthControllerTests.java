package com.verita.userservice.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.verita.model.AuthResponse;
import com.verita.model.LoginRequest;
import com.verita.model.RegisterRequest;
import com.verita.userservice.exception.*;
import com.verita.userservice.security.AuthEntryPointJwt;
import com.verita.userservice.security.JwtUtils;
import com.verita.userservice.security.UserDetailsServiceImpl;
import com.verita.userservice.security.WebSecurityConfig;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("test")
@Import(WebSecurityConfig.class)
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
}
