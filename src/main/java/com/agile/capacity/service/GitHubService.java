package com.agile.capacity.service;

import com.agile.capacity.dto.Dtos.SyncResultDto;
import com.agile.capacity.dto.Dtos.TaskDto;
import com.agile.capacity.entity.Task;
import com.agile.capacity.repository.TaskRepository;
import org.kohsuke.github.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Service
public class GitHubService {
    @Value("${github.api.token:}")
    private String configuredToken;

    private final TaskRepository taskRepository;

    public GitHubService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    /**
     * Fetches open issues from the given repository (owner/name) and upserts them as Tasks.
     * Uses the per-request token if provided; otherwise falls back to the configured
     * {@code github.api.token}.
     */
    @Transactional
    public SyncResultDto fetchTasksFromRepo(String repoName, String requestToken) {
        String token = resolveToken(requestToken);
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No GitHub token provided (Authorization header or GITHUB_API_TOKEN config)");
        }

        try {
            GitHub github = new GitHubBuilder().withOAuthToken(token).build();
            GHRepository repo = github.getRepository(repoName);
            List<Task> tasks = new ArrayList<>();
            int skipped = 0;

            for (GHIssue issue : repo.getIssues(GHIssueState.OPEN)) {
                if (issue.isPullRequest()) {
                    skipped++;
                    continue;
                }
                String id = "GH-" + issue.getNumber();
                Task task = taskRepository.findById(id).orElseGet(() -> {
                    Task t = new Task();
                    t.setId(id);
                    return t;
                });
                task.setTitle(issue.getTitle());
                task.setStatus("open");
                tasks.add(taskRepository.save(task));
            }

            List<TaskDto> dtos = tasks.stream()
                    .map(t -> new TaskDto(t.getId(), t.getTitle(), t.getEstimatedHours(), t.getStatus(),
                            null, null, null, null))
                    .toList();
            return new SyncResultDto(dtos.size(), skipped, dtos);
        } catch (GHFileNotFoundException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Repository not found or token lacks access: " + repoName);
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GitHub API error: " + e.getMessage());
        }
    }

    private String resolveToken(String requestToken) {
        if (requestToken != null && !requestToken.isBlank()) {
            return requestToken.trim();
        }
        return configuredToken;
    }
}
