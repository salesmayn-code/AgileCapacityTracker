package com.agile.capacity.service;

import com.agile.capacity.dto.Dtos.SprintDto;
import com.agile.capacity.dto.Dtos.SprintRequest;
import com.agile.capacity.dto.Dtos.TaskDto;
import com.agile.capacity.dto.Dtos.TaskRequest;
import com.agile.capacity.dto.Dtos.UserDto;
import com.agile.capacity.dto.Dtos.UserRequest;
import com.agile.capacity.entity.Sprint;
import com.agile.capacity.entity.User;
import com.agile.capacity.repository.SprintRepository;
import com.agile.capacity.repository.TaskRepository;
import com.agile.capacity.repository.UserRepository;
import com.agile.capacity.util.TaskIdGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TrackerServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private SprintRepository sprintRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private TaskIdGenerator taskIdGenerator;

    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @InjectMocks
    private TrackerService trackerService;

    private User user;
    private Sprint sprint;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(1L);
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setRole("admin");
        user.setGithubUsername("alice");
        user.setDailyCapacityHours(8);

        sprint = new Sprint();
        sprint.setId(1L);
        sprint.setName("Sprint 1");
        sprint.setStartDate(LocalDate.of(2026, 9, 1));
        sprint.setEndDate(LocalDate.of(2026, 9, 14));
    }

    // ---- users ----

    @Test
    void createUserReturnsDto() {
        UserRequest request = new UserRequest("alice", "alice@example.com", "admin", "alice", "password-123", 8);
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserDto dto = trackerService.createUser(request);

        assertThat(dto.id()).isEqualTo(1L);
        assertThat(dto.username()).isEqualTo("alice");
        assertThat(dto.role()).isEqualTo("admin");
        assertThat(dto.dailyCapacityHours()).isEqualTo(8);
    }

    @Test
    void createUserRejectsInvalidRole() {
        UserRequest request = new UserRequest("alice", "a@x.co", "hacker", null, null, 8);

        assertThatThrownBy(() -> trackerService.createUser(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void createUserRejectsBlankUsername() {
        UserRequest request = new UserRequest(" ", "a@x.co", "admin", null, null, 8);

        assertThatThrownBy(() -> trackerService.createUser(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void updateUserReplacesFields() {
        UserRequest request = new UserRequest("alice2", "new@example.com", "developer", null, null, 6);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.save(any(User.class))).thenReturn(user);

        UserDto dto = trackerService.updateUser(1L, request);

        assertThat(dto.username()).isEqualTo("alice2");
        assertThat(dto.role()).isEqualTo("developer");
    }

    @Test
    void getMissingUserThrows404() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> trackerService.getUser(99L))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    // ---- sprints ----

    @Test
    void createSprintParsesIsoDates() {
        SprintRequest request = new SprintRequest("Sprint 1", "2026-09-01", "2026-09-14");
        when(sprintRepository.save(any(Sprint.class))).thenAnswer(inv -> {
            Sprint s = inv.getArgument(0);
            s.setId(1L);
            return s;
        });

        SprintDto dto = trackerService.createSprint(request);

        assertThat(dto.name()).isEqualTo("Sprint 1");
        assertThat(dto.startDate()).isEqualTo("2026-09-01");
        assertThat(dto.endDate()).isEqualTo("2026-09-14");
        assertThat(dto.taskCount()).isZero();
        assertThat(dto.totalEstimatedHours()).isZero();
    }

    @Test
    void createSprintRejectsBlankName() {
        assertThatThrownBy(() -> trackerService.createSprint(new SprintRequest("", null, null)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void createSprintRejectsMalformedDate() {
        SprintRequest request = new SprintRequest("Sprint 1", "09/01/2026", null);

        assertThatThrownBy(() -> trackerService.createSprint(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    // ---- tasks ----

    @Test
    void createTaskAssignsTIdAndLinksAssigneeAndSprint() {
        TaskRequest request = new TaskRequest("Design API", 12, "open", 1L, 1L);
        when(taskIdGenerator.generate(any(), any())).thenReturn("T-abc12345");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(sprintRepository.findById(1L)).thenReturn(Optional.of(sprint));
        when(taskRepository.save(any(com.agile.capacity.entity.Task.class))).thenAnswer(inv -> inv.getArgument(0));

        TaskDto dto = trackerService.createTask(request);

        assertThat(dto.id()).isEqualTo("T-abc12345");
        assertThat(dto.title()).isEqualTo("Design API");
        assertThat(dto.estimatedHours()).isEqualTo(12);
        assertThat(dto.assignedUsername()).isEqualTo("alice");
        assertThat(dto.sprintName()).isEqualTo("Sprint 1");
    }

    @Test
    void updateSprintRenamesAndRevalidatesDates() {
        SprintRequest request = new SprintRequest("Sprint 1b", "2026-09-02", "2026-09-15");
        when(sprintRepository.findById(1L)).thenReturn(Optional.of(sprint));
        when(sprintRepository.save(any(Sprint.class))).thenAnswer(inv -> inv.getArgument(0));

        SprintDto dto = trackerService.updateSprint(1L, request);

        assertThat(dto.name()).isEqualTo("Sprint 1b");
        assertThat(dto.startDate()).isEqualTo("2026-09-02");
    }

    @Test
    void updateSprintRejectsEndDateBeforeStartDate() {
        SprintRequest request = new SprintRequest("Sprint 1", "2026-09-14", "2026-09-01");
        when(sprintRepository.findById(1L)).thenReturn(Optional.of(sprint));

        assertThatThrownBy(() -> trackerService.updateSprint(1L, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void updateMissingSprintThrows404() {
        when(sprintRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> trackerService.updateSprint(99L, new SprintRequest("x", null, null)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void createTaskRejectsUnknownAssignee() {
        TaskRequest request = new TaskRequest("Orphan task", 3, "open", 99L, null);
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> trackerService.createTask(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void updateMissingTaskThrows404() {
        when(taskRepository.findById("GH-nope")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> trackerService.updateTask("GH-nope",
                new TaskRequest("x", 1, "open", null, null)))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void taskRequestRequiresTitle() {
        TaskRequest request = new TaskRequest(null, 1, "open", null, null);

        assertThatThrownBy(() -> trackerService.createTask(request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
