package com.verita.userservice.controller;

import com.verita.model.UserRole;
import com.verita.userservice.repository.UserEntity;
import com.verita.userservice.repository.UserRepository;
import com.verita.userservice.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.containers.wait.strategy.Wait;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectResponse;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.S3Exception;
import software.amazon.awssdk.services.s3.model.S3Object;

import java.net.URI;
import java.util.Arrays;
import java.util.UUID;

import static org.hamcrest.Matchers.startsWith;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@ActiveProfiles("integration-test")
@Testcontainers
class AvatarEndpointE2ETests {
    private static final String BUCKET = "verita-user-portraits";
    private static final String ACCESS_KEY = "verita_minio";
    private static final String SECRET_KEY = "verita_minio_password";

    @Container
    static final PostgreSQLContainer<?> userDb = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("verita_users_avatar_test")
            .withUsername("verita_user")
            .withPassword("verita_password");

    @Container
    static final GenericContainer<?> minio = new GenericContainer<>(
            DockerImageName.parse("minio/minio:RELEASE.2025-07-23T15-54-02Z"))
            .withEnv("MINIO_ROOT_USER", ACCESS_KEY)
            .withEnv("MINIO_ROOT_PASSWORD", SECRET_KEY)
            .withCommand("server", "/data")
            .withExposedPorts(9000)
            .waitingFor(Wait.forHttp("/minio/health/ready").forPort(9000));

    private MockMvc mockMvc;
    private S3Client s3Client;

    @Autowired
    private WebApplicationContext context;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @DynamicPropertySource
    static void configureContainers(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", userDb::getJdbcUrl);
        registry.add("spring.datasource.username", userDb::getUsername);
        registry.add("spring.datasource.password", userDb::getPassword);
        registry.add("spring.datasource.driver-class-name", userDb::getDriverClassName);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create");
        registry.add("spring.jpa.database-platform", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("spring.jpa.properties.hibernate.dialect", () -> "org.hibernate.dialect.PostgreSQLDialect");
        registry.add("app.storage.s3.endpoint", AvatarEndpointE2ETests::minioEndpoint);
        registry.add("app.storage.s3.public-endpoint", AvatarEndpointE2ETests::minioEndpoint);
        registry.add("app.storage.s3.region", () -> "us-east-1");
        registry.add("app.storage.s3.access-key", () -> ACCESS_KEY);
        registry.add("app.storage.s3.secret-key", () -> SECRET_KEY);
        registry.add("app.storage.s3.path-style-access", () -> "true");
        registry.add("app.storage.buckets.user-portraits", () -> BUCKET);
    }

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        s3Client = newS3Client();
        ensureBucket();
        clearBucket();
        userRepository.deleteAll();
    }

    @Test
    void updateCurrentUserAvatarUploadsObjectAndPersistsAvatarUrl() throws Exception {
        UserEntity user = saveBasicUser("avataruser", "avatar@example.com", UserRole.USER);
        byte[] avatarBytes = new byte[]{1, 2, 3};
        MockMultipartFile avatar = new MockMultipartFile("avatar", "avatar.png", "image/png", avatarBytes);
        String expectedPrefix = minioEndpoint() + "/" + BUCKET + "/users/" + user.getId() + "/avatar-";

        mockMvc.perform(multipart("/api/v1/users/me/avatar")
                        .file(avatar)
                        .with(request -> {
                            request.setMethod("PUT");
                            return request;
                        })
                        .with(user(UserDetailsImpl.build(user))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.avatarUrl").value(startsWith(expectedPrefix)));

        UserEntity updatedUser = userRepository.findById(user.getId()).orElseThrow();
        String avatarUrl = updatedUser.getAvatarUrl();
        String objectKey = avatarUrl.substring((minioEndpoint() + "/" + BUCKET + "/").length());

        HeadObjectResponse storedObject = s3Client.headObject(request -> request.bucket(BUCKET).key(objectKey));
        assertEquals("image/png", storedObject.contentType());
        assertEquals(3L, storedObject.contentLength());
        byte[] storedBytes = s3Client.getObject(request -> request.bucket(BUCKET).key(objectKey)).readAllBytes();
        assertEquals(0, Arrays.compare(avatarBytes, storedBytes));
    }

    @Test
    void deleteCurrentUserAvatarClearsAvatarUrlAndDeletesObject() throws Exception {
        UserEntity user = saveBasicUser("clearavatar", "clearavatar@example.com", UserRole.USER);
        String objectKey = "users/" + user.getId() + "/avatar-old.png";
        s3Client.putObject(
                request -> request.bucket(BUCKET).key(objectKey).contentType("image/png"),
                RequestBody.fromBytes(new byte[]{1, 2, 3})
        );
        user.setAvatarUrl(minioEndpoint() + "/" + BUCKET + "/" + objectKey);
        user = userRepository.save(user);

        mockMvc.perform(delete("/api/v1/users/me/avatar")
                        .with(user(UserDetailsImpl.build(user))))
                .andExpect(status().isOk());

        UserEntity updatedUser = userRepository.findById(user.getId()).orElseThrow();
        assertNull(updatedUser.getAvatarUrl());
        assertThrows(NoSuchKeyException.class, () -> s3Client.headObject(request -> request.bucket(BUCKET).key(objectKey)));
    }

    @Test
    void deleteCurrentUserRemovesUserRecordAndAvatarObject() throws Exception {
        UserEntity user = saveBasicUser("deleteavataruser", "deleteavatar@example.com", UserRole.USER);
        String objectKey = "users/" + user.getId() + "/avatar-old.png";
        s3Client.putObject(
                request -> request.bucket(BUCKET).key(objectKey).contentType("image/png"),
                RequestBody.fromBytes(new byte[]{1, 2, 3})
        );
        user.setAvatarUrl(minioEndpoint() + "/" + BUCKET + "/" + objectKey);
        user = userRepository.save(user);

        mockMvc.perform(delete("/api/v1/users/me")
                        .with(user(UserDetailsImpl.build(user))))
                .andExpect(status().isNoContent());

        assertFalse(userRepository.existsById(user.getId()));
        assertThrows(NoSuchKeyException.class, () -> s3Client.headObject(request -> request.bucket(BUCKET).key(objectKey)));
    }

    private UserEntity saveBasicUser(String username, String email, UserRole role) {
        UserEntity user = new UserEntity();
        user.setUsername(username);
        user.setDisplayName(username);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode("Password123!"));
        user.setRole(role);
        return userRepository.save(user);
    }

    private void ensureBucket() {
        try {
            s3Client.headBucket(request -> request.bucket(BUCKET));
        } catch (S3Exception ex) {
            if (ex.statusCode() != 404) {
                throw ex;
            }
            s3Client.createBucket(request -> request.bucket(BUCKET));
        }
    }

    private void clearBucket() {
        s3Client.listObjectsV2Paginator(request -> request.bucket(BUCKET))
                .contents()
                .stream()
                .map(S3Object::key)
                .forEach(key -> s3Client.deleteObject(DeleteObjectRequest.builder()
                        .bucket(BUCKET)
                        .key(key)
                        .build()));
    }

    private static S3Client newS3Client() {
        return S3Client.builder()
                .endpointOverride(URI.create(minioEndpoint()))
                .region(Region.of("us-east-1"))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(ACCESS_KEY, SECRET_KEY)))
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }

    private static String minioEndpoint() {
        return "http://" + minio.getHost() + ":" + minio.getMappedPort(9000);
    }
}
