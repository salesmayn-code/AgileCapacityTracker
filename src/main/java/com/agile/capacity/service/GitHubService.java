package com.agile.capacity.service;

import com.agile.capacity.dto.Dtos.SyncResultDto;
import com.agile.capacity.dto.Dtos.TaskDto;
import com.agile.capacity.entity.SyncedRepository;
import com.agile.capacity.entity.Task;
import com.agile.capacity.github.GitHubClient;
import com.agile.capacity.repository.SyncedRepositoryRepository;
import com.agile.capacity.repository.TaskRepository;
import org.kohsuke.github.GHFileNotFoundException;
import org.kohsuke.github.GHIssue;
import org.kohsuke.github.GHIssueState;
import org.kohsuke.github.GHRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
public class GitHubService {
    private static final Logger log = LoggerFactory.getLogger(GitHubService.class);
    /** Issues closed longer ago than this make their task "stale" (never deleted). */
    static final int STALE_AFTER_DAYS = 30;

    @Value("${github.api.token:}")
    private String configuredToken;

    private final TaskRepository taskRepository;
    private final SyncedRepositoryRepository syncedRepositoryRepository;
    private final GitHubClient gitHubClient;

    public GitHubService(TaskRepository taskRepository,
                         SyncedRepositoryRepository syncedRepositoryRepository,
                         GitHubClient gitHubClient) {
        this.taskRepository = taskRepository;
        this.syncedRepositoryRepository = syncedRepositoryRepository;
        this.gitHubClient = gitHubClient;
    }

    /**
     * Syncs issues (open and closed) from the given repository into Tasks.
     * Open issues: created or title-refreshed (estimates/status/assignee/sprint preserved).
     * Closed issues: task status set to "done" + closedAt stored; local edits to
     * estimates are still preserved.
     * Successful syncs upsert the repository into synced_repository (scheduler memory).
     */
    @Transactional
    public SyncResultDto fetchTasksFromRepo(String owner, String repo, String requestToken) {
        String token = resolveToken(requestToken);
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "No GitHub token provided (X-GitHub-Token header or GITHUB_API_TOKEN config)");
        }

        try {
            GHRepository repository = gitHubClient.getRepository(token, owner + "/" + repo);
            List<Task> tasks = new ArrayList<>();
            int skipped = 0;

            for (GHIssue issue : gitHubClient.listAllIssues(repository)) {
                if (issue.isPullRequest()) {
                    skipped++;
                    continue;
                }
                String id = "GH-" + issue.getNumber();
                Task task = taskRepository.findById(id).orElseGet(() -> {
                    Task t = new Task();
                    t.setId(id);
                    t.setEstimatedHours(0);
                    t.setStatus("open");
                    return t;
                });
                task.setTitle(issue.getTitle());
                boolean closed = issue.getState() == GHIssueState.CLOSED;
                if (closed) {
                    task.setStatus("done");
                    if (issue.getClosedAt() != null) {
                        task.setGithubClosedAt(issue.getClosedAt().toInstant());
                    }
                } else {
                    task.setGithubClosedAt(null);
                }
                task.setIssueUrl(issue.getHtmlUrl() == null ? null : issue.getHtmlUrl().toString());
                tasks.add(taskRepository.save(task));
            }

            recordSync(owner, repo, "imported=" + tasks.size() + " skipped=" + skipped, true);

            List<TaskDto> dtos = tasks.stream()
                    .map(t -> new TaskDto(t.getId(), t.getTitle(), t.getEstimatedHours(), t.getStatus(),
                            null, null, null, null))
                    .toList();
            return new SyncResultDto(dtos.size(), skipped, dtos);
        } catch (GHFileNotFoundException e) {
            recordSync(owner, repo, "repository not found", false);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Repository not found or token lacks access: " + owner + "/" + repo);
        } catch (IOException e) {
            recordSync(owner, repo, "github error: " + e.getMessage(), false);
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "GitHub API error: " + e.getMessage());
        }
    }

    /** Scheduled auto-sync path: swallows errors (already recorded) so one bad repo never kills the job. */
    public void autoSync(SyncedRepository syncedRepository) {
        try {
            fetchTasksFromRepo(syncedRepository.getOwner(), syncedRepository.getRepo(), null);
        } catch (Exception e) {
            // recorded as FAILED by fetchTasksFromRepo; logged for observability
            log.warn("auto-sync failed for {}/{}: {}", syncedRepository.getOwner(), syncedRepository.getRepo(),
                    e.getMessage());
        }
    }

    /** True when a synced task's underlying issue was closed more than {@link #STALE_AFTER_DAYS} ago. */
    public boolean isStale(Task task) {
        return task.getGithubClosedAt() != null
                && task.getGithubClosedAt().isBefore(Instant.now().minus(STALE_AFTER_DAYS, ChronoUnit.DAYS));
    }

    private void recordSync(String owner, String repo, String result, boolean success) {
        try {
            SyncedRepository record = syncedRepositoryRepository.findByOwnerAndRepo(owner, repo)
                    .orElseGet(() -> {
                        SyncedRepository created = new SyncedRepository();
                        created.setOwner(owner);
                        created.setRepo(repo);
                        return created;
                    });
            record.setLastSyncedAt(Instant.now());
            record.setLastResult(result.length() > 255 ? result.substring(0, 255) : result);
            record.setLastStatus(success ? "SUCCESS" : "FAILED");
            syncedRepositoryRepository.save(record);
        } catch (Exception e) {
            // bookkeeping must never fail the sync itself
            log.warn("failed to record sync status for {}/{}: {}", owner, repo, e.getMessage());
        }
    }

    private String resolveToken(String requestToken) {
        if (requestToken != null && !requestToken.isBlank()) {
            return requestToken.trim();
        }
        return configuredToken;
    }
}
