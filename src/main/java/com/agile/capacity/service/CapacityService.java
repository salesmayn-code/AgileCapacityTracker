package com.agile.capacity.service;

import com.agile.capacity.dto.Dtos.WorkloadDto;
import com.agile.capacity.repository.TaskRepository;
import com.agile.capacity.repository.UserRepository;
import com.agile.capacity.repository.UserStats;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CapacityService {

    private final UserRepository userRepository;
    private final TaskRepository taskRepository;

    public CapacityService(UserRepository userRepository, TaskRepository taskRepository) {
        this.userRepository = userRepository;
        this.taskRepository = taskRepository;
    }

    /**
     * Workload per user: allocated = daily capacity × 10 (sprint length; derived from
     * sprint dates in Phase 9), used = sum of assigned task estimates — computed via a
     * single grouped query instead of per-user lazy loading.
     */
    public List<WorkloadDto> getWorkload() {
        Map<Long, Long> usedByUser = taskRepository.aggregateUserStats().stream()
                .collect(Collectors.toMap(UserStats::getUserId, UserStats::getUsedHours));
        return userRepository.findAll().stream()
                .map(user -> new WorkloadDto(
                        user.getId(),
                        user.getUsername(),
                        user.getRole(),
                        user.getDailyCapacityHours(),
                        user.getDailyCapacityHours() * 10,
                        usedByUser.getOrDefault(user.getId(), 0L).intValue()
                ))
                .collect(Collectors.toList());
    }
}
