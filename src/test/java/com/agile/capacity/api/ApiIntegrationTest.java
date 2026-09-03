package com.agile.capacity.api;

import com.agile.capacity.Main;
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

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ApiIntegrationTest {

    @Autowired
    private TestRestTemplate rest;

    private HttpHeaders json() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> body(ResponseEntity<String> response) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().readValue(response.getBody(), Map.class);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @Test
    @Order(1)
    void healthCheck_listEndpointsAreUp() {
        assertThat(rest.getForEntity("/api/users", List.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(rest.getForEntity("/api/sprints", List.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(rest.getForEntity("/api/tasks", List.class).getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(rest.getForEntity("/api/capacity/workload", List.class).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    @Order(2)
    void userCrudFlow() {
        Map<String, Object> createBody = Map.of(
                "username", "alice",
                "email", "alice@example.com",
                "role", "admin",
                "githubUsername", "alice",
                "dailyCapacityHours", 8);
        ResponseEntity<String> created = rest.postForEntity("/api/users",
                new HttpEntity<>(createBody, json()), String.class);
        assertThat(created.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Number id = (Number) body(created).get("id");

        ResponseEntity<String> updated = rest.exchange("/api/users/" + id,
                HttpMethod.PUT, new HttpEntity<>(Map.of(
                        "username", "alice",
                        "email", "alice@example.com",
                        "role", "developer",
                        "dailyCapacityHours", 6), json()), String.class);
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(body(updated).get("role")).isEqualTo("developer");

        ResponseEntity<String> fetched = rest.getForEntity("/api/users/" + id, String.class);
        assertThat(fetched.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(body(fetched).get("dailyCapacityHours")).isEqualTo(6);

        ResponseEntity<Void> deleted = rest.exchange("/api/users/" + id,
                HttpMethod.DELETE, null, Void.class);
        assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);

        assertThat(rest.getForEntity("/api/users/" + id, String.class).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @Order(3)
    void sprintAndTaskCrudFlowWithCascade() {
        ResponseEntity<String> sprintResponse = rest.postForEntity("/api/sprints",
                new HttpEntity<>(Map.of("name", "Sprint 1",
                        "startDate", "2026-09-01", "endDate", "2026-09-14"), json()), String.class);
        assertThat(sprintResponse.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Map<String, Object> sprint = body(sprintResponse);
        Number sprintId = (Number) sprint.get("id");
        assertThat(sprint.get("taskCount")).isEqualTo(0);

        Map<String, Object> user = body(rest.postForEntity("/api/users",
                new HttpEntity<>(Map.of("username", "bob", "role", "developer",
                        "dailyCapacityHours", 6), json()), String.class));
        Number userId = (Number) user.get("id");

        ResponseEntity<String> task = rest.postForEntity("/api/tasks",
                new HttpEntity<>(Map.of("title", "Design API", "estimatedHours", 12,
                        "status", "open", "assignedUserId", userId, "sprintId", sprintId), json()), String.class);
        assertThat(task.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        Map<String, Object> taskBody = body(task);
        assertThat(taskBody.get("assignedUsername")).isEqualTo("bob");
        assertThat(taskBody.get("sprintName")).isEqualTo("Sprint 1");

        List<Map<String, Object>> sprints = rest.getForObject("/api/sprints", List.class);
        Map<String, Object> refreshed = sprints.stream()
                .filter(s -> ((Number) s.get("id")).longValue() == sprintId.longValue())
                .findFirst().orElseThrow();
        assertThat(refreshed.get("taskCount")).isEqualTo(1);
        assertThat(refreshed.get("totalEstimatedHours")).isEqualTo(12);

        List<Map<String, Object>> workload = rest.getForObject("/api/capacity/workload", List.class);
        Map<String, Object> bob = ((List<Map<String, Object>>) (Object) workload).stream()
                .filter(w -> "bob".equals(w.get("username")))
                .findFirst().orElseThrow();
        assertThat(((Number) bob.get("allocatedHours")).intValue()).isEqualTo(60); // 6 * 10
        assertThat(((Number) bob.get("usedHours")).intValue()).isEqualTo(12);

        rest.delete("/api/sprints/" + sprintId);
        List<Map<String, Object>> tasksAfterCascade = rest.getForObject("/api/tasks", List.class);
        assertThat(tasksAfterCascade).isEmpty();
        rest.delete("/api/users/" + userId);
    }

    @Test
    @Order(4)
    void validationErrorsReturn400and404() {
        ResponseEntity<String> badRole = rest.postForEntity("/api/users",
                new HttpEntity<>(Map.of("username", "eve", "role", "hacker"), json()), String.class);
        assertThat(badRole.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        Map<String, Object> badRoleBody = body(badRole);
        assertThat(badRoleBody.get("status")).isEqualTo(400);
        assertThat(badRoleBody.get("message")).isNotNull();

        ResponseEntity<String> blankName = rest.postForEntity("/api/sprints",
                new HttpEntity<>(Map.of("name", " "), json()), String.class);
        assertThat(blankName.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        assertThat(rest.getForEntity("/api/users/9999", String.class).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @Order(5)
    void duplicateUserReturns409WithJsonError() {
        Map<String, Object> payload = Map.of("username", "dup-user", "role", "developer");
        ResponseEntity<String> first = rest.postForEntity("/api/users",
                new HttpEntity<>(payload, json()), String.class);
        assertThat(first.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        ResponseEntity<String> second = rest.postForEntity("/api/users",
                new HttpEntity<>(payload, json()), String.class);
        assertThat(second.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        Map<String, Object> errorBody = body(second);
        assertThat(errorBody.get("status")).isEqualTo(409);
        assertThat(errorBody.get("error")).isEqualTo("Conflict");

        Number id = (Number) body(first).get("id");
        rest.delete("/api/users/" + id);
    }

    @Test
    @Order(6)
    void beanValidationMatrixReturns400WithFieldErrors() {
        // invalid email
        assertThat(rest.postForEntity("/api/users",
                new HttpEntity<>(Map.of("username", "u1", "role", "developer",
                        "email", "not-an-email"), json()), String.class).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        // negative hours
        ResponseEntity<String> negative = rest.postForEntity("/api/tasks",
                new HttpEntity<>(Map.of("title", "x", "estimatedHours", -1), json()), String.class);
        assertThat(negative.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat((body(negative).get("fieldErrors"))).isNotNull();

        // invalid status
        assertThat(rest.postForEntity("/api/tasks",
                new HttpEntity<>(Map.of("title", "x", "status", "weird"), json()), String.class).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        // malformed JSON body
        HttpHeaders raw = new HttpHeaders();
        raw.setContentType(MediaType.APPLICATION_JSON);
        assertThat(rest.postForEntity("/api/tasks",
                new HttpEntity<>("{bad json", raw), String.class).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    @Order(7)
    void sprintUpdateFlow() {
        Number id = (Number) body(rest.postForEntity("/api/sprints",
                new HttpEntity<>(Map.of("name", "Original",
                        "startDate", "2026-09-01", "endDate", "2026-09-14"), json()), String.class)).get("id");

        ResponseEntity<String> updated = rest.exchange("/api/sprints/" + id, HttpMethod.PUT,
                new HttpEntity<>(Map.of("name", "Renamed",
                        "startDate", "2026-09-02", "endDate", "2026-09-20"), json()), String.class);
        assertThat(updated.getStatusCode()).isEqualTo(HttpStatus.OK);
        Map<String, Object> updatedBody = body(updated);
        assertThat(updatedBody.get("name")).isEqualTo("Renamed");
        assertThat(updatedBody.get("endDate")).isEqualTo("2026-09-20");

        ResponseEntity<String> reversed = rest.exchange("/api/sprints/" + id, HttpMethod.PUT,
                new HttpEntity<>(Map.of("name", "Bad",
                        "startDate", "2026-09-20", "endDate", "2026-09-01"), json()), String.class);
        assertThat(reversed.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);

        ResponseEntity<String> missing = rest.exchange("/api/sprints/99999", HttpMethod.PUT,
                new HttpEntity<>(Map.of("name", "Ghost"), json()), String.class);
        assertThat(missing.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        rest.delete("/api/sprints/" + id);
    }

    @Test
    @Order(8)
    void syncRouteIsReachableWithoutToken() {
        // Two-segment route matches (Phase 6 fix); with no token configured/ provided
        // the service fails fast with 400 BEFORE any GitHub call — proves routing works offline.
        ResponseEntity<String> response = rest.postForEntity("/api/github/sync/octocat/hello-world",
                new HttpEntity<>(json()), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(body(response).get("message").toString())
                .contains("No GitHub token provided");
    }
}
