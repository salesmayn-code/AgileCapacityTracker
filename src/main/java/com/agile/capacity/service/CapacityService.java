package com.agile.capacity.service;

import com.agile.capacity.dto.Dtos.WorkloadDto;
import com.agile.capacity.dto.Dtos.WorkloadResponseDto;
import com.agile.capacity.entity.Sprint;
import com.agile.capacity.entity.TeamSettings;
import com.agile.capacity.repository.SprintRepository;
import com.agile.capacity.repository.TaskRepository;
import com.agile.capacity.repository.TeamSettingsRepository;
import com.agile.capacity.repository.UserRepository;
import com.agile.capacity.repository.UserStats;
import com.agile.capacity.util.SprintLengthCalculator;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CapacityService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final SprintRepository sprintRepository;
    private final TeamSettingsRepository teamSettingsRepository;

    public CapacityService(UserRepository userRepository, TaskRepository taskRepository,
                           SprintRepository sprintRepository, TeamSettingsRepository teamSettingsRepository) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
        this.sprintRepository = sprintRepository;
        this.teamSettingsRepository = teamSettingsRepository;
    }

    /**
     * Workload v2: single source of truth for capacity math. Sprint length =
     * weekdays of the sprint covering today (fallback 10 when no sprint is
     * active); allocated/used percentages are computed here, not in the client.
     */
    public WorkloadResponseDto getWorkload() {
        LocalDate today = LocalDate.now();
        int workingHours = getWorkingHoursPerDay();
        final int sprintDays;
        final String sprintName;
        boolean sprintActive = false;

        List<Sprint> active = sprintRepository.findAll().stream()
                .filter(s -> SprintLengthCalculator.isActive(s.getStartDate(), s.getEndDate(), today))
                .sorted(Comparator.comparing(Sprint::getStartDate))
                .toList();
        if (active.isEmpty()) {
            sprintDays = SprintLengthCalculator.FALLBACK_SPRINT_DAYS;
            sprintName = null;
        } else {
            Sprint current = active.get(0);
            sprintDays = SprintLengthCalculator.weekdayCount(current.getStartDate(), current.getEndDate());
            sprintName = current.getName();
            sprintActive = true;
        }

        int totalDenominator = Math.max(1, sprintDays * workingHours);
        Map<Long, Long> usedByUser = taskRepository.aggregateUserStats().stream()
                .collect(Collectors.toMap(UserStats::getUserId, UserStats::getUsedHours));
        List<WorkloadDto> team = userRepository.findAll().stream()
                .map(user -> {
                    int used = usedByUser.getOrDefault(user.getId(), 0L).intValue();
                    int allocated = user.getDailyCapacityHours() * sprintDays;
                    return new WorkloadDto(
                            user.getId(),
                            user.getUsername(),
                            user.getRole(),
                            user.getDailyCapacityHours(),
                            allocated,
                            used,
                            percent(used, totalDenominator),
                            percent(allocated, totalDenominator)
                    );
                })
                .collect(Collectors.toList());

        return new WorkloadResponseDto(sprintDays, sprintName, sprintActive, workingHours, team);
    }

    private int getWorkingHoursPerDay() {
        return teamSettingsRepository.findById(TeamSettingsRepository.SINGLETON_ID)
                .map(TeamSettings::getWorkingHoursPerDay)
                .orElse(8);
    }

    private static int percent(int value, int denominator) {
        return Math.round((float) value * 100 / denominator);
    }
}
