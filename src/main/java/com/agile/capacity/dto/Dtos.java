package com.agile.capacity.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
                              int dailyCapacityHours, int allocatedHours, int usedHours,
                              int usedPercent, int allocatedPercent) {}

    /**
     * Workload v2 envelope (Phase 9): all capacity math is computed server-side.
     * sprintDays = weekdays (Mon-Fri) of the current sprint, or the fallback (10)
     * when no sprint covers today; sprintActive lets the UI label "no active sprint".
     */
    public record WorkloadResponseDto(int sprintDays, String sprintName, boolean sprintActive,
                                      int workingHoursPerDay, List<WorkloadDto> team) {}

    public record TeamSettingsDto(int workingHoursPerDay) {}

    public record TeamSettingsRequest(
            @NotNull(message = "workingHoursPerDay is required")
            @Min(value = 1, message = "workingHoursPerDay must be at least 1")
            @Max(value = 24, message = "workingHoursPerDay must be at most 24") Integer workingHoursPerDay) {}

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
