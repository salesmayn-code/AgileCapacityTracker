package com.agile.capacity.service;

import com.agile.capacity.dto.Dtos.WorkloadDto;
import com.agile.capacity.entity.User;
import com.agile.capacity.repository.TaskRepository;
import com.agile.capacity.repository.UserRepository;
import com.agile.capacity.repository.UserStats;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CapacityServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private CapacityService capacityService;

    @Test
    void workloadComputesAllocatedAndUsedHoursFromAggregates() {
        User alice = user(1L, "alice", "admin", 8);
        User bob = user(2L, "bob", "developer", 6);

        when(userRepository.findAll()).thenReturn(List.of(alice, bob));
        when(taskRepository.aggregateUserStats()).thenReturn(List.of(
                stats(1L, 15L),  // alice: 12 + 3
                stats(2L, 0L))); // bob: no hours (absent from group-by in real DB; here explicit)

        List<WorkloadDto> workload = capacityService.getWorkload();

        assertThat(workload).hasSize(2);
        WorkloadDto aliceDto = workload.get(0);
        assertThat(aliceDto.allocatedHours()).isEqualTo(80);   // 8 h/day * 10 days
        assertThat(aliceDto.usedHours()).isEqualTo(15);
        WorkloadDto bobDto = workload.get(1);
        assertThat(bobDto.allocatedHours()).isEqualTo(60);
        assertThat(bobDto.usedHours()).isZero();
    }

    @Test
    void usersWithoutTasksDefaultToZeroUsedHours() {
        User solo = user(1L, "solo", "developer", 4);
        when(userRepository.findAll()).thenReturn(List.of(solo));
        when(taskRepository.aggregateUserStats()).thenReturn(List.of()); // group-by yields nothing

        List<WorkloadDto> workload = capacityService.getWorkload();

        assertThat(workload).hasSize(1);
        assertThat(workload.get(0).usedHours()).isZero();
        assertThat(workload.get(0).allocatedHours()).isEqualTo(40);
    }

    @Test
    void workloadIsEmptyWhenNoUsers() {
        when(userRepository.findAll()).thenReturn(List.of());
        when(taskRepository.aggregateUserStats()).thenReturn(List.of());

        assertThat(capacityService.getWorkload()).isEmpty();
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
