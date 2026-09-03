package com.agile.capacity.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.agile.capacity.Main;
import com.agile.capacity.util.SprintLengthCalculator;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ApiIntegrationTest {

    private static final String ADMIN_EMAIL = "admin@test.local";
    private static final String ADMIN_PASSWORD = "test-admin-password";

    @Autowired
    private TestRestTemplate rest;

    private final ObjectMapper mapper = new ObjectMapper();

    // ---- helpers ----

    private HttpHeaders json() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    private HttpHeaders authed(String token) {
        HttpHeaders headers = json();
        headers.set("Authorization", "Bearer " + token);
        return headers;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> body(ResponseEntity<String> response) {
        try {
            return mapper.readValue(response.getBody(), Map.class);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> bodyList(ResponseEntity<String> response) {
        try {
            return mapper.readValue(response.getBody(), List.class);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> contentOf(String path, String token) {
        return (List<Map<String, Object>>) body(get(path, token)).get("content");
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> workloadTeam(String token) {
        return (List<Map<String, Object>>) body(get("/api/capacity/workload", token)).get("team");
    }

    private ResponseEntity<String> get(String path, String token) {
        return rest.exchange(path, HttpMethod.GET, new HttpEntity<>(authed(token)), String.class);
    }

    private ResponseEntity<String> post(String path, String token, Map<String, Object> payload) {
        return rest.exchange(path, HttpMethod.POST, new HttpEntity<>(payload, authed(token)), String.class);
    }

    private ResponseEntity<String> put(String path, String token, Map<String, Object> payload) {
        return rest.exchange(path, HttpMethod.PUT, new HttpEntity<>(payload, authed(token)), String.class);
    }

    private ResponseEntity<String> delete(String path, String token) {
        return rest.exchange(path, HttpMethod.DELETE, new HttpEntity<>(authed(token)), String.class);
    }

    private String login(String email, String password) {
        ResponseEntity<String> response = rest.postForEntity("/api/auth/login",
                new HttpEntity<>(Map.of("email", email, "password", password), json()), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return body(response).get("token").toString();
    }

    /** Creates a user via the admin API and returns its id. */
    private Number createUser(String adminToken, String username, String email, String role, String password) {
        ResponseEntity<String> response = post("/api/users", adminToken, Map.of(
                "username", username, "email", email, "role", role,
                "password", password, "dailyCapacityHours", 6));
        assertThat(response.getStatusCode()).as("create %s", username).isEqualTo(HttpStatus.CREATED);
        return (Number) body(response).get("id");
    }

    // ---- auth ----

    @Test
    @Order(0)
    void bootstrapAdminCanLogIn() {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        ResponseEntity<String> me = get("/api/auth/me", token);
        assertThat(me.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> meBody = body(me);
        assertThat(meBody.get("email")).isEqualTo(ADMIN_EMAIL);
        assertThat(meBody.get("role")).isEqualTo("admin");
    }

    @Test
    @Order(1)
    void wrongPasswordReturns401WithJsonError() {
        ResponseEntity<String> response = rest.postForEntity("/api/auth/login",
                new HttpEntity<>(Map.of("email", ADMIN_EMAIL, "password", "wrong"), json()), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        Map<String, Object> errorBody = body(response);
        assertThat(errorBody.get("status")).isEqualTo(401);
        assertThat(errorBody.get("message")).isNotNull();
    }

    @Test
    @Order(2)
    void anonymousRequestsAreRejectedWith401() {
        assertThat(rest.getForEntity("/api/users", String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(rest.getForEntity("/api/sprints", String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(rest.getForEntity("/api/tasks", String.class).getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(rest.getForEntity("/api/capacity/workload", String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        ResponseEntity<String> unauthCreate = rest.postForEntity("/api/users",
                new HttpEntity<>(Map.of("username", "x", "role", "admin"), json()), String.class);
        assertThat(unauthCreate.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);

        // malformed token is also 401 (not 500)
        HttpHeaders bad = json();
        bad.set("Authorization", "Bearer garbage");
        assertThat(rest.exchange("/api/users", HttpMethod.GET, new HttpEntity<>(bad), String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);

        // login stays open
        assertThat(rest.postForEntity("/api/auth/login",
                new HttpEntity<>(Map.of("email", ADMIN_EMAIL, "password", "wrong"), json()), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED); // reachable, auths checked, not 404/500
    }

    @Test
    @Order(3)
    void roleMatrixEnforced() {
        String admin = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        Number leadId = createUser(admin, "lead-user", "lead@test.local", "team_lead", "lead-pass-123");
        Number devId = createUser(admin, "dev-user", "dev@test.local", "developer", "dev-pass-1234");
        String lead = login("lead@test.local", "lead-pass-123");
        String dev = login("dev@test.local", "dev-pass-1234");

        // developer: read OK
        assertThat(get("/api/users", dev).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(get("/api/capacity/workload", dev).getStatusCode()).isEqualTo(HttpStatus.OK);

        // developer: user management forbidden
        assertThat(post("/api/users", dev, Map.of("username", "x", "email", "x@x.x", "role", "developer",
                "password", "longpass-1")).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(delete("/api/users/" + leadId, dev).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // developer: sprint writes forbidden, but task writes allowed (matrix v1)
        assertThat(post("/api/sprints", dev, Map.of("name", "Dev Sprint")).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
        ResponseEntity<String> devTask = post("/api/tasks", dev, Map.of("title", "Dev task"));
        assertThat(devTask.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String devTaskId = body(devTask).get("id").toString();

        // team_lead: sprint/task writes OK, user management forbidden
        ResponseEntity<String> sprint = post("/api/sprints", lead, Map.of("name", "Lead Sprint",
                "startDate", "2026-09-01", "endDate", "2026-09-14"));
        assertThat(sprint.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Number sprintId = (Number) body(sprint).get("id");

        ResponseEntity<String> task = post("/api/tasks", lead, Map.of("title", "Lead task",
                "estimatedHours", 4, "assignedUserId", devId, "sprintId", sprintId));
        assertThat(task.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        String taskIdStr = body(task).get("id").toString();

        assertThat(post("/api/users", lead, Map.of("username", "y", "email", "y@y.y", "role", "developer",
                "password", "longpass-1")).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // developer can update a task (task writes allowed for all roles per matrix v1)
        ResponseEntity<String> updated = put("/api/tasks/" + taskIdStr, dev, Map.of("title", "Dev updated",
                "estimatedHours", 5, "status", "in_progress"));
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(body(updated).get("status")).isEqualTo("in_progress");

        // team_lead cannot sync GitHub (admin+team_lead allowed; developer forbidden) - prove developer 403
        assertThat(rest.exchange("/api/github/sync/octocat/hello-world", HttpMethod.POST,
                new HttpEntity<>(authed(dev)), String.class).getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);

        // cleanup
        assertThat(delete("/api/tasks/" + taskIdStr, lead).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(delete("/api/tasks/" + devTaskId, lead).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(delete("/api/sprints/" + sprintId, lead).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(delete("/api/users/" + devId, admin).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(delete("/api/users/" + leadId, admin).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    // ---- CRUD flows (as admin) ----

    @Test
    @Order(4)
    void userCrudFlowAsAdmin() {
        String admin = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        ResponseEntity<String> created = post("/api/users", admin, Map.of(
                "username", "alice", "email", "alice-crud@test.local", "role", "admin",
                "password", "alice-pass-123", "githubUsername", "alice", "dailyCapacityHours", 8));
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Number id = (Number) body(created).get("id");

        ResponseEntity<String> updated = put("/api/users/" + id, admin, Map.of(
                "username", "alice", "email", "alice@test.local", "role", "developer",
                "dailyCapacityHours", 6));
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(body(updated).get("role")).isEqualTo("developer");

        assertThat(get("/api/users/" + id, admin).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(delete("/api/users/" + id, admin).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(get("/api/users/" + id, admin).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @Order(5)
    void paginatedListsAsAdmin() {
        String admin = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        Map<String, Object> users = body(get("/api/users", admin));
        assertThat(users).containsKeys("content", "page", "size", "totalElements", "totalPages", "last");

        Map<String, Object> pageOne = body(get("/api/users?page=0&size=2", admin));
        assertThat((Number) pageOne.get("size")).isEqualTo(2);

        Map<String, Object> oversized = body(get("/api/users?size=5000", admin));
        assertThat(((Number) oversized.get("size")).intValue()).isLessThanOrEqualTo(100);

        Map<String, Object> negativePage = body(get("/api/users?page=-5", admin));
        assertThat((Number) negativePage.get("page")).isEqualTo(0);

        assertThat(body(get("/api/tasks", admin))).containsKey("content");
        assertThat(body(get("/api/sprints", admin))).containsKey("content");
    }

    @Test
    @Order(6)
    void sprintTaskFlowWorkloadAndCascade() {
        String admin = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        Number userId = createUser(admin, "bob", "bob@test.local", "developer", "bob-pass-1234");

        ResponseEntity<String> sprint = post("/api/sprints", admin, Map.of("name", "Sprint 1",
                "startDate", "2026-09-01", "endDate", "2026-09-14"));
        assertThat(sprint.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Number sprintId = (Number) body(sprint).get("id");
        assertThat(body(sprint).get("taskCount")).isEqualTo(0);

        ResponseEntity<String> task = post("/api/tasks", admin, Map.of("title", "Design API",
                "estimatedHours", 12, "status", "open", "assignedUserId", userId, "sprintId", sprintId));
        assertThat(task.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Map<String, Object> taskBody = body(task);
        assertThat(taskBody.get("assignedUsername")).isEqualTo("bob");
        assertThat(taskBody.get("sprintName")).isEqualTo("Sprint 1");

        Map<String, Object> refreshed = contentOf("/api/sprints", admin).stream()
                .filter(s -> ((Number) s.get("id")).longValue() == sprintId.longValue())
                .findFirst().orElseThrow();
        assertThat(refreshed.get("taskCount")).isEqualTo(1);
        assertThat(refreshed.get("totalEstimatedHours")).isEqualTo(12);

        // workload v2: bob's row inside the envelope (no active sprint covers 2026-09-01..14 today, or one may exist;
        // assert via the envelope's own team list, not raw response shape)
        Map<String, Object> bob = workloadTeam(admin).stream()
                .filter(w -> "bob".equals(w.get("username")))
                .findFirst().orElseThrow();
        assertThat(((Number) bob.get("allocatedHours")).intValue())
                .isEqualTo(6 * ((Number) body(get("/api/capacity/workload", admin)).get("sprintDays")).intValue());
        assertThat(((Number) bob.get("usedHours")).intValue()).isEqualTo(12);

        assertThat(delete("/api/sprints/" + sprintId, admin).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(contentOf("/api/tasks", admin)).isEmpty();
        assertThat(delete("/api/users/" + userId, admin).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    @Order(7)
    void workloadV2ComputesCapacityServerSide() {
        String admin = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        Number userId = createUser(admin, "wanda", "wanda@test.local", "developer", "wanda-pass-12");

        // A dated sprint whose range covers today
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(2);
        LocalDate end = today.plusDays(2);
        ResponseEntity<String> sprint = post("/api/sprints", admin, Map.of("name", "Workload Sprint",
                "startDate", start.toString(), "endDate", end.toString()));
        assertThat(sprint.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Number sprintId = (Number) body(sprint).get("id");

        ResponseEntity<String> task = post("/api/tasks", admin, Map.of("title", "Workload task",
                "estimatedHours", 6, "status", "open", "assignedUserId", userId, "sprintId", sprintId));
        assertThat(task.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        Map<String, Object> envelope = body(get("/api/capacity/workload", admin));
        assertThat(envelope.get("sprintName")).isEqualTo("Workload Sprint");
        assertThat(envelope.get("sprintActive")).isEqualTo(true);
        int expectedDays = SprintLengthCalculator.weekdayCount(start, end);
        assertThat(((Number) envelope.get("sprintDays")).intValue()).isEqualTo(expectedDays);
        assertThat(((Number) envelope.get("workingHoursPerDay")).intValue()).isEqualTo(8); // V4 seed

        Map<String, Object> wanda = ((List<Map<String, Object>>) envelope.get("team")).stream()
                .filter(w -> "wanda".equals(w.get("username")))
                .findFirst().orElseThrow();
        int allocated = ((Number) wanda.get("allocatedHours")).intValue();  // 6h/day * sprintDays
        assertThat(allocated).isEqualTo(6 * expectedDays);
        assertThat(((Number) wanda.get("usedHours")).intValue()).isEqualTo(6);
        // percentages: 6 used / (days * 8) * 100
        assertThat(((Number) wanda.get("usedPercent")).intValue())
                .isEqualTo(Math.round(6f * 100 / (expectedDays * 8)));
        assertThat(((Number) wanda.get("allocatedPercent")).intValue())
                .isEqualTo(Math.round(6f * expectedDays * 100 / (expectedDays * 8f)));

        assertThat(delete("/api/sprints/" + sprintId, admin).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(delete("/api/users/" + userId, admin).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    @Order(8)
    void workloadFallsBackWhenNoActiveSprint() {
        String admin = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        Map<String, Object> envelope = body(get("/api/capacity/workload", admin));
        // No sprint covers "today" in this isolated test run (workload sprint was deleted above)
        assertThat(envelope.get("sprintActive")).isEqualTo(false);
        assertThat(((Number) envelope.get("sprintDays")).intValue()).isEqualTo(10);
        assertThat(envelope.get("sprintName")).isNull();
    }

    @Test
    @Order(9)
    void teamSettingsAuthMatrixAndFlow() {
        String admin = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        Number devId = createUser(admin, "dev-settings", "dev-settings@test.local", "developer", "dev-pass-1234");
        String dev = login("dev-settings@test.local", "dev-pass-1234");

        // seeded row readable by any authenticated user
        Map<String, Object> initial = body(get("/api/settings", dev));
        assertThat(initial.get("workingHoursPerDay")).isEqualTo(8);

        // developer cannot write
        assertThat(put("/api/settings", dev, Map.of("workingHoursPerDay", 6)).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);

        // admin writes and the value flows into the workload envelope
        ResponseEntity<String> updated = put("/api/settings", admin, Map.of("workingHoursPerDay", 6));
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(body(updated).get("workingHoursPerDay")).isEqualTo(6);
        assertThat(((Number) body(get("/api/capacity/workload", admin)).get("workingHoursPerDay")).intValue())
                .isEqualTo(6);

        // out-of-range values -> 400
        assertThat(put("/api/settings", admin, Map.of("workingHoursPerDay", 0)).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(put("/api/settings", admin, Map.of("workingHoursPerDay", 25)).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        // restore the default for later tests
        assertThat(put("/api/settings", admin, Map.of("workingHoursPerDay", 8)).getStatusCode())
                .isEqualTo(HttpStatus.OK);
        assertThat(delete("/api/users/" + devId, admin).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    @Order(10)
    void validationAndDuplicateErrors() {
        String admin = login(ADMIN_EMAIL, ADMIN_PASSWORD);

        // duplicate username -> 409 (email differs; password supplied so validation passes)
        Number dupId = createUser(admin, "dup-user", "dup@test.local", "developer", "dup-pass-123");
        ResponseEntity<String> dup = post("/api/users", admin, Map.of(
                "username", "dup-user", "email", "other@test.local", "role", "developer",
                "password", "longpass-123"));
        assertThat(dup.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(body(dup).get("status")).isEqualTo(409);

        // duplicate email -> 409 as well
        ResponseEntity<String> dupEmail = post("/api/users", admin, Map.of(
                "username", "dup-email", "email", "dup@test.local", "role", "developer",
                "password", "longpass-123"));
        assertThat(dupEmail.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);

        // validation matrix -> 400 with fieldErrors
        ResponseEntity<String> badRole = post("/api/users", admin, Map.of(
                "username", "eve", "email", "eve@test.local", "role", "hacker"));
        assertThat(badRole.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(body(badRole).get("fieldErrors")).isNotNull();

        ResponseEntity<String> negative = post("/api/tasks", admin, Map.of("title", "x", "estimatedHours", -1));
        assertThat(negative.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<String> shortPassword = post("/api/users", admin, Map.of(
                "username", "pw", "email", "pw@test.local", "role", "developer", "password", "short"));
        assertThat(shortPassword.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        // missing password on create -> 400
        ResponseEntity<String> noPassword = post("/api/users", admin, Map.of(
                "username", "nopass", "email", "nopass@test.local", "role", "developer"));
        assertThat(noPassword.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        // sprint date order -> 400
        Number sid = (Number) body(post("/api/sprints", admin, Map.of("name", "S",
                "startDate", "2026-09-14", "endDate", "2026-09-01"))).get("id");
        assertThat(sid).isNull(); // create fails -> body is error JSON, no id

        assertThat(delete("/api/users/" + dupId, admin).getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
    }

    @Test
    @Order(11)
    void syncRouteStillReachableOffline() {
        String admin = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        // No token configured/provided -> service fails fast with 400 before any GitHub call
        HttpHeaders headers = authed(admin);
        ResponseEntity<String> response = rest.postForEntity("/api/github/sync/octocat/hello-world",
                new HttpEntity<>(headers), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(body(response).get("message").toString()).contains("No GitHub token provided");
    }
}
