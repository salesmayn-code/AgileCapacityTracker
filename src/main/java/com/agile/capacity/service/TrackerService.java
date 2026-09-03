package com.agile.capacity.service;

import com.agile.capacity.dto.Dtos.PageDto;
import com.agile.capacity.dto.Dtos.SprintDto;
import com.agile.capacity.dto.Dtos.SprintRequest;
import com.agile.capacity.dto.Dtos.TaskDto;
import com.agile.capacity.dto.Dtos.TaskRequest;
import com.agile.capacity.dto.Dtos.TeamSettingsDto;
import com.agile.capacity.dto.Dtos.TeamSettingsRequest;
import com.agile.capacity.dto.Dtos.UserDto;
import com.agile.capacity.dto.Dtos.UserRequest;
import com.agile.capacity.entity.Sprint;
import com.agile.capacity.entity.Task;
import com.agile.capacity.entity.TeamSettings;
import com.agile.capacity.entity.User;
import com.agile.capacity.repository.SprintStats;
import com.agile.capacity.repository.SprintRepository;
import com.agile.capacity.repository.TaskRepository;
import com.agile.capacity.repository.TeamSettingsRepository;
import com.agile.capacity.repository.UserRepository;
import com.agile.capacity.util.PageRequests;
import com.agile.capacity.util.TaskIdGenerator;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TrackerService {
    private static final Set<String> VALID_ROLES = Set.of("admin", "team_lead", "developer");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;

    private final UserRepository userRepository;
    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;
    private final TaskIdGenerator taskIdGenerator;
    private final PasswordEncoder passwordEncoder;
    private final TeamSettingsRepository teamSettingsRepository;

    public TrackerService(UserRepository userRepository, SprintRepository sprintRepository,
                           TaskRepository taskRepository, TaskIdGenerator taskIdGenerator,
                           PasswordEncoder passwordEncoder, TeamSettingsRepository teamSettingsRepository) {
        this.userRepository = userRepository;
        this.sprintRepository = sprintRepository;
        this.taskRepository = taskRepository;
        this.taskIdGenerator = taskIdGenerator;
        this.passwordEncoder = passwordEncoder;
        this.teamSettingsRepository = teamSettingsRepository;
    }

    // ---- Users ----

    public PageDto<UserDto> listUsers(Integer page, Integer size) {
        Page<UserDto> result = userRepository.findAll(PageRequests.of(page, size)).map(this::toUserDto);
        return toPageDto(result);
    }

    public UserDto getUser(Long id) {
        return toUserDto(requireUser(id));
    }

    @Transactional
    public UserDto createUser(UserRequest request) {
        if (request.password() == null || request.password().isBlank()) {
            throw badRequest("password is required when creating a user");
        }
        User user = new User();
        applyUser(user, request);
        return toUserDto(userRepository.save(user));
    }

    @Transactional
    public UserDto updateUser(Long id, UserRequest request) {
        User user = requireUser(id);
        applyUser(user, request);
        return toUserDto(userRepository.save(user));
    }

    @Transactional
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }

    private void applyUser(User user, UserRequest request) {
        if (request.username() == null || request.username().isBlank()) {
            throw badRequest("username is required");
        }
        if (!VALID_ROLES.contains(request.role())) {
            throw badRequest("role must be one of " + VALID_ROLES);
        }
        user.setUsername(request.username());
        user.setEmail(request.email());
        user.setRole(request.role());
        user.setGithubUsername(request.githubUsername());
        user.setDailyCapacityHours(request.dailyCapacityHours());
        if (request.password() != null && !request.password().isBlank()) {
            user.setPasswordHash(passwordEncoder.encode(request.password()));
        }
    }

    private UserDto toUserDto(User user) {
        return new UserDto(user.getId(), user.getUsername(), user.getEmail(), user.getRole(),
                user.getGithubUsername(), user.getDailyCapacityHours());
    }

    // ---- Sprints ----

    public PageDto<SprintDto> listSprints(Integer page, Integer size) {
        Pageable pageable = PageRequests.of(page, size);
        Map<Long, SprintStats> stats = sprintRepository.aggregateSprintStats().stream()
                .collect(Collectors.toMap(SprintStats::getSprintId, Function.identity()));
        Page<SprintDto> result = sprintRepository.findAll(pageable)
                .map(s -> toSprintDto(s, stats.getOrDefault(s.getId(), emptyStats(s.getId()))));
        return toPageDto(result);
    }

    private SprintStats emptyStats(Long sprintId) {
        return new SprintStats() {
            @Override public Long getSprintId() { return sprintId; }
            @Override public long getTaskCount() { return 0; }
            @Override public long getTotalHours() { return 0; }
        };
    }

    @Transactional
    public SprintDto createSprint(SprintRequest request) {
        Sprint sprint = new Sprint();
        applySprint(sprint, request);
        return toSprintDto(sprintRepository.save(sprint), emptyStats(null));
    }

    @Transactional
    public SprintDto updateSprint(Long id, SprintRequest request) {
        Sprint sprint = requireSprint(id);
        applySprint(sprint, request);
        SprintStats stats = sprintRepository.aggregateSprintStats().stream()
                .filter(s -> id.equals(s.getSprintId()))
                .findFirst()
                .orElseGet(() -> emptyStats(id));
        return toSprintDto(sprintRepository.save(sprint), stats);
    }

    @Transactional
    public void deleteSprint(Long id) {
        sprintRepository.deleteById(id);
    }

    private void applySprint(Sprint sprint, SprintRequest request) {
        if (request.name() == null || request.name().isBlank()) {
            throw badRequest("name is required");
        }
        LocalDate start = parseDate(request.startDate());
        LocalDate end = parseDate(request.endDate());
        if (start != null && end != null && end.isBefore(start)) {
            throw badRequest("endDate must be on or after startDate");
        }
        sprint.setName(request.name());
        sprint.setStartDate(start);
        sprint.setEndDate(end);
    }

    private SprintDto toSprintDto(Sprint s, SprintStats stats) {
        return new SprintDto(s.getId(), s.getName(),
                s.getStartDate() == null ? null : s.getStartDate().format(DATE),
                s.getEndDate() == null ? null : s.getEndDate().format(DATE),
                (int) stats.getTotalHours(), (int) stats.getTaskCount());
    }

    // ---- Tasks ----

    public PageDto<TaskDto> listTasks(Integer page, Integer size) {
        Page<TaskDto> result = taskRepository.findAll(PageRequests.of(page, size)).map(this::toTaskDto);
        return toPageDto(result);
    }

    @Transactional
    public TaskDto createTask(TaskRequest request) {
        Task task = new Task();
        task.setId((String) taskIdGenerator.generate(null, task));
        applyTask(task, request);
        return toTaskDto(taskRepository.save(task));
    }

    @Transactional
    public TaskDto updateTask(String id, TaskRequest request) {
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found: " + id));
        applyTask(task, request);
        return toTaskDto(taskRepository.save(task));
    }

    @Transactional
    public void deleteTask(String id) {
        taskRepository.deleteById(id);
    }

    private void applyTask(Task task, TaskRequest request) {
        if (request.title() == null || request.title().isBlank()) {
            throw badRequest("title is required");
        }
        task.setTitle(request.title());
        task.setEstimatedHours(request.estimatedHours());
        task.setStatus(request.status());
        task.setAssignedUser(request.assignedUserId() == null ? null : requireUser(request.assignedUserId()));
        task.setSprint(request.sprintId() == null ? null : requireSprint(request.sprintId()));
    }

    private TaskDto toTaskDto(Task task) {
        return new TaskDto(task.getId(), task.getTitle(), task.getEstimatedHours(), task.getStatus(),
                task.getAssignedUser() == null ? null : task.getAssignedUser().getId(),
                task.getAssignedUser() == null ? null : task.getAssignedUser().getUsername(),
                task.getSprint() == null ? null : task.getSprint().getId(),
                task.getSprint() == null ? null : task.getSprint().getName());
    }

    // ---- Team settings ----

    public TeamSettingsDto getTeamSettings() {
        return new TeamSettingsDto(getWorkingHoursPerDay());
    }

    @Transactional
    public TeamSettingsDto updateTeamSettings(TeamSettingsRequest request) {
        int hours = request.workingHoursPerDay();
        if (hours < 1 || hours > 24) {
            throw badRequest("workingHoursPerDay must be between 1 and 24");
        }
        TeamSettings settings = requireTeamSettings();
        settings.setWorkingHoursPerDay(hours);
        return new TeamSettingsDto(teamSettingsRepository.save(settings).getWorkingHoursPerDay());
    }

    private int getWorkingHoursPerDay() {
        return teamSettingsRepository.findById(TeamSettingsRepository.SINGLETON_ID)
                .map(TeamSettings::getWorkingHoursPerDay)
                .orElse(8);
    }

    private TeamSettings requireTeamSettings() {
        return teamSettingsRepository.findById(TeamSettingsRepository.SINGLETON_ID)
                .orElseGet(() -> {
                    TeamSettings created = new TeamSettings();
                    created.setId(TeamSettingsRepository.SINGLETON_ID);
                    created.setWorkingHoursPerDay(8);
                    return teamSettingsRepository.save(created);
                });
    }

    // ---- helpers ----

    private <T> PageDto<T> toPageDto(Page<T> page) {
        return new PageDto<>(page.getContent(), page.getNumber(), page.getSize(),
                page.getTotalElements(), page.getTotalPages(), page.isLast());
    }

    private User requireUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id));
    }

    private Sprint requireSprint(Long id) {
        return sprintRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Sprint not found: " + id));
    }

    private LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value, DATE);
        } catch (DateTimeParseException e) {
            throw badRequest("invalid date, expected YYYY-MM-DD: " + value);
        }
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
