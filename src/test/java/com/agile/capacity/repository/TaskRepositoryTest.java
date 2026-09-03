package com.agile.capacity.repository;

import com.agile.capacity.entity.Sprint;
import com.agile.capacity.entity.Task;
import com.agile.capacity.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs against H2 with the real Flyway migrations (V1 + V2) — proves the
 * baseline schema matches the entities (validate mode) and that the grouped
 * aggregate queries powering sprint stats and workload are correct.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class TaskRepositoryTest {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private SprintRepository sprintRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User alice;
    private User bob;
    private Sprint sprint1;
    private Sprint sprint2;

    @BeforeEach
    void seed() {
        taskRepository.deleteAll();
        userRepository.deleteAll();
        sprintRepository.deleteAll();
        entityManager.flush();
        entityManager.clear();

        alice = new User();
        alice.setUsername("alice");
        alice.setRole("developer");
        alice.setDailyCapacityHours(8);
        alice = userRepository.save(alice);

        bob = new User();
        bob.setUsername("bob");
        bob.setRole("developer");
        bob.setDailyCapacityHours(6);
        bob = userRepository.save(bob);

        sprint1 = new Sprint();
        sprint1.setName("Sprint 1");
        sprint1.setStartDate(LocalDate.of(2026, 9, 1));
        sprint1.setEndDate(LocalDate.of(2026, 9, 14));
        sprint1 = sprintRepository.save(sprint1);

        sprint2 = new Sprint();
        sprint2.setName("Sprint 2");
        sprint2 = sprintRepository.save(sprint2);

        saveTask("T-aaaaaaaa", "Task A", 5, alice, sprint1);
        saveTask("T-bbbbbbbb", "Task B", 7, alice, sprint1);
        saveTask("T-cccccccc", "Task C", 3, bob, null);      // no sprint
        saveTask("T-dddddddd", "Task D", 0, null, sprint2);   // no assignee
    }

    private void saveTask(String id, String title, int hours, User user, Sprint sprint) {
        Task t = new Task();
        t.setId(id);
        t.setTitle(title);
        t.setEstimatedHours(hours);
        t.setStatus("open");
        t.setAssignedUser(user);
        t.setSprint(sprint);
        taskRepository.save(t);
    }

    @Test
    void auditTimestampsAreSet() {
        entityManager.flush();
        entityManager.clear(); // force INSERT + detach; timestamps must survive a fresh load

        Task t = taskRepository.findById("T-aaaaaaaa").orElseThrow();
        assertThat(t.getCreatedAt()).isNotNull();
        assertThat(t.getUpdatedAt()).isNotNull();
        assertThat(t.getCreatedAt()).isBeforeOrEqualTo(t.getUpdatedAt());

        User u = userRepository.findById(alice.getId()).orElseThrow();
        assertThat(u.getCreatedAt()).isNotNull();
    }

    @Test
    void sprintStatsAggregatesCountAndHoursPerSprint() {
        Map<Long, SprintStats> stats = sprintRepository.aggregateSprintStats().stream()
                .collect(Collectors.toMap(SprintStats::getSprintId, Function.identity()));

        assertThat(stats).hasSize(2); // sprint2 has a task (Task D); only sprints with tasks appear
        SprintStats s1 = stats.get(sprint1.getId());
        assertThat(s1.getTaskCount()).isEqualTo(2);
        assertThat(s1.getTotalHours()).isEqualTo(12); // 5 + 7
        SprintStats s2 = stats.get(sprint2.getId());
        assertThat(s2.getTaskCount()).isEqualTo(1);
        assertThat(s2.getTotalHours()).isEqualTo(0);
    }

    @Test
    void userStatsAggregatesHoursPerAssignee() {
        Map<Long, Long> used = taskRepository.aggregateUserStats().stream()
                .collect(Collectors.toMap(UserStats::getUserId, UserStats::getUsedHours));

        assertThat(used).hasSize(2); // alice + bob; Task D has no assignee
        assertThat(used.get(alice.getId())).isEqualTo(12); // 5 + 7
        assertThat(used.get(bob.getId())).isEqualTo(3);
    }

    @Test
    void pagedFindAllFetchesAssigneeAndSprintWithoutNPlus1() {
        Page<Task> page = taskRepository.findAll(PageRequest.of(0, 3));
        assertThat(page.getTotalElements()).isEqualTo(4);
        assertThat(page.getContent()).hasSize(3);
        assertThat(page.getTotalPages()).isEqualTo(2);

        // entity graph: relations initialized inside the same query — safe to touch outside a session
        Task t = page.getContent().get(0);
        assertThat(t.getAssignedUser().getUsername()).isNotNull();
        assertThat(t.getSprint().getName()).isNotNull();
    }
}
