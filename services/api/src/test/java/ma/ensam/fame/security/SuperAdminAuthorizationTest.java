package ma.ensam.fame.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Endpoint-level authorization tests for the superadmin control plane.
 * Verifies that /api/admin/** is reachable only by ROLE_SUPERADMIN, and that
 * anonymous, students, and ordinary administrators are denied.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class SuperAdminAuthorizationTest {

    @Container
    static final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("fame").withUsername("fame").withPassword("fame");

    @Container
    static final GenericContainer<?> redis = new GenericContainer<>("redis:7-alpine").withExposedPorts(6379);

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.data.redis.host", redis::getHost);
        registry.add("spring.data.redis.port", () -> redis.getMappedPort(6379));
        registry.add("fame.worker.public-key", () -> "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
        registry.add("fame.admin.email", () -> "superadmin@ensam-umi.ac.ma");
        registry.add("fame.bootstrap.admin-password", () -> "test");
    }

    @Autowired
    private MockMvc mockMvc;

    @Test
    void anonymousIsDenied() throws Exception {
        mockMvc.perform(get("/api/admin/overview")).andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "STUDENT")
    void studentIsDenied() throws Exception {
        mockMvc.perform(get("/api/admin/overview")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ORGANIZER")
    void organizerIsDenied() throws Exception {
        mockMvc.perform(get("/api/admin/overview")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void ordinaryAdminIsDeniedSuperadminEndpoints() throws Exception {
        mockMvc.perform(get("/api/admin/overview")).andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "SUPERADMIN")
    void superadminIsAllowed() throws Exception {
        mockMvc.perform(get("/api/admin/overview")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "SUPERADMIN")
    void superadminCanReadAudit() throws Exception {
        mockMvc.perform(get("/api/admin/audit")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "SUPERADMIN")
    void superadminCanReadHealth() throws Exception {
        mockMvc.perform(get("/api/admin/health")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void ordinaryAdminCanStillAccessStaffEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/companies")).andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = "SUPERADMIN")
    void auditLogHasNoDeleteEndpoint() throws Exception {
        mockMvc.perform(delete("/api/admin/audit").with(org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf()))
                .andExpect(status().isMethodNotAllowed());
    }
}
