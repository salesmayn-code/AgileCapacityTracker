package com.agile.capacity.schedule;

import com.agile.capacity.entity.Sprint;
import com.agile.capacity.entity.SprintSnapshot;
import com.agile.capacity.entity.Task;
import com.agile.capacity.repository.SprintRepository;
import com.agile.capacity.repository.SprintSnapshotRepository;
import com.agile.capacity.repository.TaskRepository;
import com.agile.capacity.util.SprintLengthCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Phase 11 burndown snapshots: one row per active sprint per day, recording
 * remaining (not-done) estimated hours. This is the real burndown history —
 * the dashboard ideal line is derived from sprint dates, the actual line
 * from these snapshots.
 */
@Component
public class SnapshotScheduler {
    private static final Logger log = LoggerFactory.getLogger(SnapshotScheduler.class);

    private final SprintRepository sprintRepository;
    private final TaskRepository taskRepository;
    private final SprintSnapshotRepository snapshotRepository;

    public SnapshotScheduler(SprintRepository sprintRepository, TaskRepository taskRepository,
                             SprintSnapshotRepository snapshotRepository) {
        this.sprintRepository = sprintRepository;
        this.taskRepository = taskRepository;
        this.snapshotRepository = snapshotRepository;
    }

    /** Daily at 23:50 UTC — end of day, before the date rolls over in most zones. */
    @Scheduled(cron = "0 50 23 * * *", zone = "UTC")
    @Transactional
    public void snapshotDaily() {
        LocalDate today = LocalDate.now();
        List<Sprint> active = sprintRepository.findAll().stream()
                .filter(s -> SprintLengthCalculator.isActive(s.getStartDate(), s.getEndDate(), today))
                .toList();
        for (Sprint sprint : active) {
            LocalDate date = today;
            if (snapshotRepository.findBySprintIdOrderBySnapshotDateAsc(sprint.getId()).stream()
                    .anyMatch(snap -> snap.getSnapshotDate().equals(date))) {
                continue; // already snapshotted today (idempotent)
            }
            int remaining = taskRepository.findAll().stream()
                    .filter(t -> t.getSprint() != null && sprint.getId().equals(t.getSprint().getId()))
                    .filter(t -> !"done".equals(t.getStatus()))
                    .mapToInt(Task::getEstimatedHours)
                    .sum();
            SprintSnapshot snapshot = new SprintSnapshot();
            snapshot.setSprint(sprint);
            snapshot.setSnapshotDate(today);
            snapshot.setRemainingHours(remaining);
            snapshotRepository.save(snapshot);
            log.info("snapshot recorded for sprint {} ({}): remaining={}h", sprint.getId(), sprint.getName(), remaining);
        }
    }
}
