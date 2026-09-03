package com.agile.capacity.service;

import com.agile.capacity.dto.Dtos.WorkloadDto;
import com.agile.capacity.dto.Dtos.WorkloadResponseDto;
import com.agile.capacity.entity.Sprint;
import com.agile.capacity.entity.TeamSettings;
import com.agile.capacity.entity.User;
import com.agile.capacity.repository.SprintRepository;
import com.agile.capacity.repository.TaskRepository;
import com.agile.capacity.repository.TeamSettingsRepository;
import com.agile.capacity.repository.UserRepository;
import com.agile.capacity.repository.UserStats;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CapacityServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private SprintRepository sprintRepository;

    @Mock
    private TeamSettingsRepository teamSettingsRepository;

    @InjectMocks
    private CapacityService capacityService;

    @Test
    void workloadUsesActiveSprintWeekdayCountAndTeamWorkingHours() {
        // 2026-09-01 (Tue) .. 2026-09-11 (Fri): 9 weekdays
        User alice = user(1L, "alice", "admin", 8);
        User bob = user(2L, "bob", "developer", 6);
        Sprint active = sprint(10L, "Sprint 1", "2026-09-01", "2026-09-11");

        when(teamSettingsRepository.findById(anyLong()))
                .thenReturn(Optional.of(settings(6)));
        when(sprintRepository.findAll()).thenReturn(List.of(active));
        when(userRepository.findAll()).thenReturn(List.of(alice, bob));
        when(taskRepository.aggregateUserStats()).thenReturn(List.of(
                stats(1L, 27L),  // alice
                stats(2L, 0L))); // bob explicit zero

        WorkloadResponseDto workload = capacityService.getWorkload();

        assertThat(workload.sprintDays()).isEqualTo(9);
        assertThat(workload.sprintName()).isEqualTo("Sprint 1");
        assertThat(workload.sprintActive()).isTrue();
        assertThat(workload.workingHoursPerDay()).isEqualTo(6);
        assertThat(workload.team()).hasSize(2);

        WorkloadDto aliceDto = workload.team().get(0);
        assertThat(aliceDto.allocatedHours()).isEqualTo(72);  // 8 * 9
        assertThat(aliceDto.usedHours()).isEqualTo(27);
        assertThat(aliceDto.usedPercent()).isEqualTo(50);     // 27 / 54
        assertThat(aliceDto.allocatedPercent()).isEqualTo(133); // 72 / 54

        WorkloadDto bobDto = workload.team().get(1);
        assertThat(bobDto.allocatedHours()).isEqualTo(54);  // 6 * 9
        assertThat(bobDto.usedHours()).isZero();
        assertThat(bobDto.usedPercent()).isZero();
        assertThat(bobDto.allocatedPercent()).isEqualTo(100); // exactly full allocation
    }

    @Test
    void fallsBackTo10DaysWhenNoSprintIsActiveToday() {
        User solo = user(1L, "solo", "developer", 4);
        // A sprint entirely in the future (and one in the past) must not drive the math.
        Sprint past = sprint(1L, "Past", "2020-01-06", "2020-01-10");
        Sprint future = sprint(2L, "Future", "2999-01-06", "2999-01-10");

        when(teamSettingsRepository.findById(anyLong()))
                .thenReturn(Optional.of(settings(8)));
        when(sprintRepository.findAll()).thenReturn(List.of(past, future));
        when(userRepository.findAll()).thenReturn(List.of(solo));
        when(taskRepository.aggregateUserStats()).thenReturn(List.of());

        WorkloadResponseDto workload = capacityService.getWorkload();

        assertThat(workload.sprintActive()).isFalse();
        assertThat(workload.sprintDays()).isEqualTo(10);
        assertThat(workload.sprintName()).isNull();
        WorkloadDto soloDto = workload.team().get(0);
        assertThat(soloDto.allocatedHours()).isEqualTo(40);
        assertThat(soloDto.usedPercent()).isZero();
    }

    @Test
    void datelessSprintsAreIgnoredForActiveDetection() {
        User solo = user(1L, "solo", "developer", 4);
        Sprint dateless = new Sprint();
        dateless.setId(3L);
        dateless.setName("No dates");

        when(teamSettingsRepository.findById(anyLong()))
                .thenReturn(Optional.of(settings(8)));
        when(sprintRepository.findAll()).thenReturn(List.of(dateless));
        when(userRepository.findAll()).thenReturn(List.of(solo));
        when(taskRepository.aggregateUserStats()).thenReturn(List.of());

        WorkloadResponseDto workload = capacityService.getWorkload();

        assertThat(workload.sprintActive()).isFalse();
        sprintActiveFallback(workload);
    }

    @Test
    void earliestActiveSprintWinsWhenOverlapping() {
        User solo = user(1L, "solo", "developer", 4);
        Sprint late = sprint(5L, "Late", "2026-09-07", "2026-09-18");
        Sprint early = sprint(6L, "Early", "2026-09-01", "2026-09-11");

        when(teamSettingsRepository.findById(anyLong()))
                .thenReturn(Optional.of(settings(8)));
        when(sprintRepository.findAll()).thenReturn(List.of(late, early));
        when(userRepository.findAll()).thenReturn(List.of(solo));
        when(taskRepository.aggregateUserStats()).thenReturn(List.of());

        WorkloadResponseDto workload = capacityService.getWorkload();

        assertThat(workload.sprintName()).isEqualTo("Early");
    }

    @Test
    void settingsDefaultsTo8HoursWhenRowIsMissing() {
        User solo = user(1L, "solo", "developer", 4);
        when(teamSettingsRepository.findById(anyLong())).thenReturn(Optional.empty());
        when(sprintRepository.findAll()).thenReturn(List.of());
        when(userRepository.findAll()).thenReturn(List.of(solo));
        when(taskRepository.aggregateUserStats()).thenReturn(List.of());

        WorkloadResponseDto workload = capacityService.getWorkload();

        assertThat(workload.workingHoursPerDay()).isEqualTo(8);
    }

    @Test
    void workloadIsEmptyWhenNoUsers() {
        when(teamSettingsRepository.findById(anyLong()))
                .thenReturn(Optional.of(settings(8)));
        when(sprintRepository.findAll()).thenReturn(List.of());
        when(userRepository.findAll()).thenReturn(List.of());
        when(taskRepository.aggregateUserStats()).thenReturn(List.of());

        WorkloadResponseDto workload = capacityService.getWorkload();

        assertThat(workload.team()).isEmpty();
    }

    private void sprintActiveFallback(WorkloadResponseDto workload) {
        assertThat(workload.sprintDays()).isEqualTo(10);
        assertThat(workload.sprintName()).isNull();
    }

    private TeamSettings settings(int hours) {
        TeamSettings settings = new TeamSettings();
        settings.setId(1L);
        settings.setWorkingHoursPerDay(hours);
        return settings;
    }

    private Sprint sprint(Long id, String name, String start, String end) {
        Sprint sprint = new Sprint();
        sprint.setId(id);
        sprint.setName(name);
        sprint.setStartDate(LocalDate.parse(start));
        sprint.setEndDate(LocalDate.parse(end));
        return sprint;
    }

    private User user(Long id, String name, String role, int hours) {
        User u = new User();
        u.setId(id);
        u.setUsername(name);
        u.setRole(role);
        u.setDailyCapacityHours(hours);
        return u;
    }

    private UserStats stats(Long userId, long usedHours) {
        return new UserStats() {
            @Override public Long getUserId() { return userId; }
            @Override public long getUsedHours() { return usedHours; }
        };
    }
}
