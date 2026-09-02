package com.agile.capacity.service;

import com.agile.capacity.dto.Dtos.WorkloadDto;
import com.agile.capacity.entity.Task;
import com.agile.capacity.entity.User;
import com.agile.capacity.repository.UserRepository;
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

    @InjectMocks
    private CapacityService capacityService;

    @Test
    void workloadComputesAllocatedAndUsedHours() {
        User alice = user("alice", "admin", 8);
        Task big = task(12);
        Task small = task(3);
        alice.setTasks(List.of(big, small));

        User bob = user("bob", "developer", 6);
        bob.setTasks(List.of());

        when(userRepository.findAll()).thenReturn(List.of(alice, bob));

        List<WorkloadDto> workload = capacityService.getWorkload();

        assertThat(workload).hasSize(2);
        WorkloadDto aliceDto = workload.get(0);
        assertThat(aliceDto.allocatedHours()).isEqualTo(80);   // 8 h/day * 10 days
        assertThat(aliceDto.usedHours()).isEqualTo(15);        // 12 + 3
        WorkloadDto bobDto = workload.get(1);
        assertThat(bobDto.allocatedHours()).isEqualTo(60);
        assertThat(bobDto.usedHours()).isZero();
    }

    @Test
    void workloadIsEmptyWhenNoUsers() {
        when(userRepository.findAll()).thenReturn(List.of());

        assertThat(capacityService.getWorkload()).isEmpty();
    }

    private User user(String name, String role, int hours) {
        User u = new User();
        u.setUsername(name);
        u.setRole(role);
        u.setDailyCapacityHours(hours);
        return u;
    }

    private Task task(int hours) {
        Task t = new Task();
        t.setEstimatedHours(hours);
        return t;
    }
}
