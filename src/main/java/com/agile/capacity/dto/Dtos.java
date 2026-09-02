package com.agile.capacity.dto;

import java.util.List;

public final class Dtos {
    private Dtos() {}

    public record UserDto(Long id, String username, String email, String role,
                          String githubUsername, int dailyCapacityHours) {}

    public record UserRequest(String username, String email, String role,
                              String githubUsername, int dailyCapacityHours) {}

    public record SprintDto(Long id, String name, String startDate, String endDate,
                            int totalEstimatedHours, int taskCount) {}

    public record SprintRequest(String name, String startDate, String endDate) {}

    public record TaskDto(String id, String title, int estimatedHours, String status,
                          Long assignedUserId, String assignedUsername,
                          Long sprintId, String sprintName) {}

    public record TaskRequest(String title, int estimatedHours, String status,
                               Long assignedUserId, Long sprintId) {}

    public record WorkloadDto(Long userId, String username, String role,
                               int dailyCapacityHours, int allocatedHours, int usedHours) {}

    public record SyncResultDto(int imported, int skipped, List<TaskDto> tasks) {}
}
