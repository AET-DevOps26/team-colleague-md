## Plan: User Service Implementation

Implement complete user management, JWT authentication, and RBAC by integrating Spring Security and Spring Data JPA with the OpenAPI generated interfaces. Setup testing and Docker health checks.

### Steps
1. Update `build.gradle` to add dependencies for `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `jjwt` (JWT), and a database driver (H2 for testing, PostgreSQL for production).
2. Configure `application.properties` with PostgreSQL connection settings, JWT secret/expiration, and bind `/health` endpoint visibility if necessary.
3. Configure `application-test.properties` for temporary in-memory H2 database.
4. Create JPA Entities (e.g. `UserEntity`) and `UserRepository` to persist users, mapping fields to the OpenAPI models (`User`, `Role`).
5. Implement `SecurityConfig`, `JwtTokenProvider`, and `JwtAuthenticationFilter` for role-based access control checking (`ROLE_USER`, `ROLE_ADMIN`, `ROLE_VERIFIED`).
6. Create `AuthService` and `UserService` to handle registration, JWT generation, password hashing, and user/admin profile management.
7. Wire these services into the `AuthController`, `UsersController`, and implement a new `HealthController` implementing the generated API interfaces.
8. Write unit and integration tests using JUnit and Mockito to achieve >80% coverage.
9. Add a `HEALTHCHECK` instruction to the `Dockerfile` to verify the `/health` endpoint.

### Further Considerations
1. What relational database should we target for production? Should we use H2 for local development/tests and PostgreSQL for production?
2. Do you have a preference for how exactly roles are persisted (Enum vs standard entity role tables)?
