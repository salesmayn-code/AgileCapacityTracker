package com.agile.capacity.service;

import com.agile.capacity.dto.Dtos.ActivityDto;
import com.agile.capacity.dto.Dtos.BurndownDto;
import com.agile.capacity.dto.Dtos.BurndownPointDto;
import com.agile.capacity.dto.Dtos.DashboardStatsDto;
import com.agile.capacity.dto.Dtos.GithubTaskStatsDto;
import com.agile.capacity.dto.Dtos.SyncedRepoStatusDto;
import com.agile.capacity.entity.Sprint;
import com.agile.capacity.entity.SprintSnapshot;
import com.agile.capacity.entity.SyncedRepository;
import com.agile.capacity.entity.Task;
import com.agile.capacity.entity.User;
import com.agile.capacity.repository.SprintRepository;
import com.agile.capacity.repository.SprintSnapshotRepository;
import com.agile.capacity.repository.SyncedRepositoryRepository;
import com.agile.capacity.repository.TaskRepository;
import com.agile.capacity.repository.UserRepository;
import com.agile.capacity.util.SprintLengthCalculator;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Phase 11: one call feeding the dashboard overview — burndown (real snapshot
 * history), GitHub task stats, recent activity (derived from audit timestamps),
 * synced-repo status, and the capacity summary.
 */
@Service
public class DashboardService {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE;

    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final SprintSnapshotRepository snapshotRepository;
    private final SyncedRepositoryRepository syncedRepositoryRepository;
    private final CapacityService capacityService;
    private final GitHubService gitHubService;

    public DashboardService(SprintRepository sprintRepository, TaskRepository taskRepository,
                            UserRepository userRepository, SprintSnapshotRepository snapshotRepository,
                            SyncedRepositoryRepository syncedRepositoryRepository,
                            CapacityService capacityService, GitHubService gitHubService) {
        this.sprintRepository = sprintRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.snapshotRepository = snapshotRepository;
        this.syncedRepositoryRepository = syncedRepositoryRepository;
        this.capacityService = capacityService;
        this.gitHubService = gitHubService;
    }

    public DashboardStatsDto getStats() {
        LocalDate today = LocalDate.now();

        List<Task> allTasks = taskRepository.findAll();
        List<User> users = userRepository.findAll();
        List<Sprint> sprints = sprintRepository.findAll();

        // ---- capacity summary (reuses the workload engine's math) ----
        var workload = capacityService.getWorkload();
        int teamCapacityPercent = workload.team().isEmpty() ? 0
                : Math.round((float) workload.team().stream().mapToInt(w -> w.usedPercent()).sum() / workload.team().size());
        int overallocated = (int) workload.team().stream().filter(w -> w.usedHours() > w.allocatedHours()).count();

        // ---- active sprints + burndown of the earliest active one ----
        List<Sprint> active = sprints.stream()
                .filter(s -> SprintLengthCalculator.isActive(s.getStartDate(), s.getEndDate(), today))
                .sorted(Comparator.comparing(Sprint::getStartDate))
                .toList();
        BurndownDto burndown = active.isEmpty() ? null : burndownOf(active.get(0), allTasks, today);

        // ---- GitHub task stats (synced GH-* tasks) ----
        List<Task> ghTasks = allTasks.stream().filter(t -> t.getId().startsWith("GH-")).toList();
        int stale = (int) ghTasks.stream().filter(gitHubService::isStale).count();
        GithubTaskStatsDto githubStats = new GithubTaskStatsDto(
                ghTasks.size(),
                (int) ghTasks.stream().filter(t -> "open".equals(t.getStatus())).count(),
                (int) ghTasks.stream().filter(t -> "in_progress".equals(t.getStatus())).count(),
                (int) ghTasks.stream().filter(t -> "done".equals(t.getStatus())).count(),
                stale);

        // ---- recent activity: newest entities across types, capped at 10 ----
        List<ActivityDto> activity = new ArrayList<>();
        recordActivity(activity, allTasks.stream()
                .filter(t -> t.getCreatedAt() != null)
                .sorted(Comparator.comparing(Task::getCreatedAt).reversed())
                .limit(10)
                .map(t -> new ActivityDto("—", "created task", t.getTitle(), t.getId(), t.getCreatedAt().toString())));
        recordActivity(activity, sprints.stream()
                .filter(s -> s.getCreatedAt() != null)
                .sorted(Comparator.comparing(Sprint::getCreatedAt, Comparator.reverseOrder()))
                .limit(10)
                .map(s -> new ActivityDto("—", "created sprint", s.getName(),
                        s.getId() == null ? null : String.valueOf(s.getId()), s.getCreatedAt().toString())));
        recordActivity(activity, users.stream()
                .filter(u -> u.getCreatedAt() != null)
                .sorted(Comparator.comparing(User::getCreatedAt, Comparator.reverseOrder()))
                .limit(10)
                .map(u -> new ActivityDto(u.getUsername(), "joined the team", u.getUsername(),
                        u.getId() == null ? null : String.valueOf(u.getId()), u.getCreatedAt().toString())));
        activity.sort(Comparator.comparing(ActivityDto::occurredAt).reversed());
        List<ActivityDto> topActivity = activity.stream().limit(10).toList();

        // ---- synced repo statuses ----
        List<SyncedRepoStatusDto> syncedRepos = syncedRepositoryRepository.findAll().stream()
                .map(this::toRepoDto)
                .toList();

        return new DashboardStatsDto(
                teamCapacityPercent,
                !active.isEmpty(),
                active.size(),
                users.size(),
                overallocated,
                burndown,
                githubStats,
                topActivity,
                syncedRepos);
    }

    private BurndownDto burndownOf(Sprint sprint, List<Task> allTasks, LocalDate today) {
        List<Task> sprintTasks = allTasks.stream()
                .filter(t -> t.getSprint() != null && sprint.getId().equals(t.getSprint().getId()))
                .toList();
        int totalHours = sprintTasks.stream().mapToInt(Task::getEstimatedHours).sum();
        int remainingHours = sprintTasks.stream()
                .filter(t -> !"done".equals(t.getStatus()))
                .mapToInt(Task::getEstimatedHours).sum();

        // Real history from snapshots + today's point appended live
        List<BurndownPointDto> history = new ArrayList<>();
        for (SprintSnapshot snapshot : snapshotRepository.findBySprintIdOrderBySnapshotDateAsc(sprint.getId())) {
            LocalDate date = snapshot.getSnapshotDate();
            history.add(new BurndownPointDto(date.format(ISO), snapshot.getRemainingHours(),
                    idealHours(sprint, date, totalHours)));
        }
        if (!history.isEmpty() || totalHours > 0) {
            history.add(new BurndownPointDto(today.format(ISO), remainingHours, idealHours(sprint, today, totalHours)));
        }

        return new BurndownDto(sprint.getId(), sprint.getName(),
                sprint.getStartDate() == null ? null : sprint.getStartDate().format(ISO),
                sprint.getEndDate() == null ? null : sprint.getEndDate().format(ISO),
                history, totalHours, remainingHours);
    }

    /** Ideal line: linear burn from total to zero across the sprint's weekdays. */
    private Integer idealHours(Sprint sprint, LocalDate date, int totalHours) {
        if (sprint.getStartDate() == null || sprint.getEndDate() == null || date == null) {
            return null;
        }
        int totalDays = SprintLengthCalculator.weekdayCount(sprint.getStartDate(), sprint.getEndDate());
        int elapsed = SprintLengthCalculator.weekdayCount(sprint.getStartDate(),
                date.isBefore(sprint.getEndDate()) ? date : sprint.getEndDate());
        if (totalDays <= 0) return totalHours;
        return Math.round((float) totalHours * (totalDays - elapsed) / totalDays);
    }

    private void recordActivity(List<ActivityDto> sink, java.util.stream.Stream<ActivityDto> stream) {
        stream.forEachOrdered(sink::add);
    }

    private SyncedRepoStatusDto toRepoDto(SyncedRepository r) {
        return new SyncedRepoStatusDto(r.getId(), r.getOwner(), r.getRepo(),
                r.getLastSyncedAt() == null ? null : r.getLastSyncedAt().toString(),
                r.getLastResult(), r.getLastStatus());
    }
}
