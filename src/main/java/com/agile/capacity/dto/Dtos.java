package com.agile.capacity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.util.List;

public final class Dtos {
    private Dtos() {}

    public record UserDto(Long id, String username, String email, String role,
                          String githubUsername, int dailyCapacityHours) {}

    public record UserRequest(
            @NotBlank(message = "username is required") String username,
            @NotBlank(message = "email is required")
            @Email(message = "email must be a valid address") String email,
            @NotBlank(message = "role is required")
            @Pattern(regexp = "admin|team_lead|developer", message = "role must be one of admin, team_lead, developer")
            String role,
            String githubUsername,
            @Size(min = 8, max = 100, message = "password must be between 8 and 100 characters")
            String password,
            @PositiveOrZero(message = "dailyCapacityHours must be zero or more") int dailyCapacityHours) {}

    public record SprintDto(Long id, String name, String startDate, String endDate,
                             int totalEstimatedHours, int taskCount) {}

    public record SprintRequest(
            @NotBlank(message = "name is required") String name,
            String startDate,
            String endDate) {}

    public record TaskDto(String id, String title, int estimatedHours, String status,
                          Long assignedUserId, String assignedUsername,
                          Long sprintId, String sprintName) {}

    public record TaskRequest(
            @NotBlank(message = "title is required") String title,
            @PositiveOrZero(message = "estimatedHours must be zero or more") int estimatedHours,
            @Pattern(regexp = "open|in_progress|done", message = "status must be one of open, in_progress, done")
            String status,
            Long assignedUserId,
            Long sprintId) {}

    public record WorkloadDto(Long userId, String username, String role,
                              int dailyCapacityHours, int allocatedHours, int usedHours) {}

    public record SyncResultDto(int imported, int skipped, List<TaskDto> tasks) {}

    /** Generic paginated response wrapper; stable contract independent of Spring's Page serialization. */
    public record PageDto<T>(List<T> content, int page, int size, long totalElements, int totalPages, boolean last) {}

    // ---- Auth ----

    public record LoginRequest(
            @NotBlank(message = "email is required") @Email(message = "email must be a valid address") String email,
            @NotBlank(message = "password is required") String password) {}

    public record LoginResponse(String token, long expiresAtEpochSeconds, UserDto user) {}

    public record AuthMeRequest() {}
}
