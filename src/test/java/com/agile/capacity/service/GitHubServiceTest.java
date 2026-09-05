package com.agile.capacity.service;

import com.agile.capacity.dto.Dtos.SyncResultDto;
import com.agile.capacity.dto.Dtos.TaskDto;
import com.agile.capacity.entity.SyncedRepository;
import com.agile.capacity.entity.Task;
import com.agile.capacity.github.GitHubClient;
import com.agile.capacity.repository.SyncedRepositoryRepository;
import com.agile.capacity.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.kohsuke.github.GHFileNotFoundException;
import org.kohsuke.github.GHIssue;
import org.kohsuke.github.GHIssueState;
import org.kohsuke.github.GHRepository;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GitHubServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private SyncedRepositoryRepository syncedRepositoryRepository;

    @Mock
    private GitHubClient gitHubClient;

    @Mock
    private GHRepository repository;

    @Mock
    private GHIssue issue1;

    @Mock
    private GHIssue issue2;

    @Mock
    private GHIssue pullRequest;

    private GitHubService service(String configuredToken) {
        GitHubService s = new GitHubService(taskRepository, syncedRepositoryRepository, gitHubClient);
        ReflectionTestUtils.setField(s, "configuredToken", configuredToken);
        return s;
    }

    private Task existingTask(String id, String title, int hours, String status) {
        Task t = new Task();
        t.setId(id);
        t.setTitle(title);
        t.setEstimatedHours(hours);
        t.setStatus(status);
        return t;
    }

    private void stubIssue(GHIssue issue, int number, String title, boolean isPr, GHIssueState state) throws IOException {
        when(issue.isPullRequest()).thenReturn(isPr);
        if (!isPr) {
            when(issue.getNumber()).thenReturn(number);
            when(issue.getTitle()).thenReturn(title);
            when(issue.getState()).thenReturn(state);
            when(issue.getHtmlUrl()).thenReturn(new java.net.URL("https://github.com/octocat/hello-world/issues/" + number));
        }
    }

    @Test
    void syncWithoutAnyTokenFailsFastWith400() {
        assertThatThrownBy(() -> service("").fetchTasksFromRepo("octocat", "hello-world", null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
        verify(taskRepository, never()).save(any());
    }

    @Test
    void syncWithBlankRequestTokenFallsBackAndFailsWhenConfigEmpty() {
        assertThatThrownBy(() -> service("  ").fetchTasksFromRepo("octocat", "hello-world", "   "))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void syncImportsNewIssuesWithDefaultsAndSkipsPullRequests() throws Exception {
        stubIssue(issue1, 11, "Fix login bug", false, GHIssueState.OPEN);
        stubIssue(issue2, 12, "Add docs", false, GHIssueState.OPEN);
        stubIssue(pullRequest, 13, "PR thing", true, GHIssueState.OPEN);
        when(gitHubClient.getRepository("tok", "octocat/hello-world")).thenReturn(repository);
        when(gitHubClient.listAllIssues(repository)).thenReturn(List.of(issue1, issue2, pullRequest));
        when(taskRepository.findById(anyString())).thenReturn(Optional.empty());
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
        when(syncedRepositoryRepository.findByOwnerAndRepo("octocat", "hello-world"))
                .thenReturn(Optional.of(new SyncedRepository()));

        SyncResultDto result = service("").fetchTasksFromRepo("octocat", "hello-world", "tok");

        assertThat(result.imported()).isEqualTo(2);
        assertThat(result.skipped()).isEqualTo(1);
        assertThat(result.tasks()).hasSize(2);
        TaskDto first = result.tasks().get(0);
        assertThat(first.id()).isEqualTo("GH-11");
        assertThat(first.title()).isEqualTo("Fix login bug");
        assertThat(first.estimatedHours()).isZero();
        assertThat(first.status()).isEqualTo("open");
        // successful sync recorded
        verify(syncedRepositoryRepository).save(any(SyncedRepository.class));
    }

    @Test
    void syncIsIdempotentAndPreservesEstimatesOnExistingTasks() throws Exception {
        Task existing = existingTask("GH-11", "Old title", 8, "in_progress");
        stubIssue(issue1, 11, "New title", false, GHIssueState.OPEN);
        when(gitHubClient.getRepository("tok", "octocat/hello-world")).thenReturn(repository);
        when(gitHubClient.listAllIssues(repository)).thenReturn(List.of(issue1));
        when(taskRepository.findById("GH-11")).thenReturn(Optional.of(existing));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
        when(syncedRepositoryRepository.findByOwnerAndRepo("octocat", "hello-world"))
                .thenReturn(Optional.of(new SyncedRepository()));

        SyncResultDto result = service("").fetchTasksFromRepo("octocat", "hello-world", "tok");

        assertThat(result.imported()).isEqualTo(1);
        TaskDto dto = result.tasks().get(0);
        assertThat(dto.id()).isEqualTo("GH-11");
        assertThat(dto.title()).isEqualTo("New title");          // refreshed
        assertThat(dto.estimatedHours()).isEqualTo(8);           // preserved
        assertThat(dto.status()).isEqualTo("in_progress");       // preserved (issue still open)
    }

    @Test
    void closedIssueMarksTaskDoneAndStoresUrlAndClosedAt() throws Exception {
        Date closedAt = Date.from(Instant.parse("2026-08-01T12:00:00Z"));
        stubIssue(issue1, 42, "Ship it", false, GHIssueState.CLOSED);
        when(issue1.getClosedAt()).thenReturn(closedAt);
        when(gitHubClient.getRepository("tok", "octocat/hello-world")).thenReturn(repository);
        when(gitHubClient.listAllIssues(repository)).thenReturn(List.of(issue1));
        Task existing = existingTask("GH-42", "Old", 5, "in_progress");
        when(taskRepository.findById("GH-42")).thenReturn(Optional.of(existing));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
        when(syncedRepositoryRepository.findByOwnerAndRepo("octocat", "hello-world"))
                .thenReturn(Optional.of(new SyncedRepository()));

        service("").fetchTasksFromRepo("octocat", "hello-world", "tok");

        assertThat(existing.getStatus()).isEqualTo("done");       // closed -> done
        assertThat(existing.getEstimatedHours()).isEqualTo(5);   // estimate preserved
        assertThat(existing.getGithubClosedAt()).isEqualTo(closedAt.toInstant());
        assertThat(existing.getIssueUrl()).isEqualTo("https://github.com/octocat/hello-world/issues/42");
    }

    @Test
    void staleTaskDetectedWhenClosedOver30DaysAgo() {
        Task old = existingTask("GH-1", "old", 2, "done");
        old.setGithubClosedAt(Instant.now().minus(31, java.time.temporal.ChronoUnit.DAYS));
        Task fresh = existingTask("GH-2", "fresh", 2, "done");
        fresh.setGithubClosedAt(Instant.now().minus(5, java.time.temporal.ChronoUnit.DAYS));
        Task manual = existingTask("T-abc", "manual", 2, "open");

        GitHubService svc = service("");
        assertThat(svc.isStale(old)).isTrue();
        assertThat(svc.isStale(fresh)).isFalse();
        assertThat(svc.isStale(manual)).isFalse();  // no githubClosedAt -> never stale
    }

    @Test
    void autoSyncSwallowsErrors() throws Exception {
        SyncedRepository synced = new SyncedRepository();
        synced.setOwner("octocat");
        synced.setRepo("hello-world");
        GitHubService svc = service("cfg");
        // no GitHub mocking needed: fetchTasksFromRepo will throw (no repo stub);
        // autoSync must swallow it
        when(syncedRepositoryRepository.findByOwnerAndRepo(anyString(), anyString()))
                .thenThrow(new RuntimeException("db down"));
        when(gitHubClient.getRepository(eq("cfg"), anyString()))
                .thenThrow(new GHFileNotFoundException("not found"));

        svc.autoSync(synced);  // must not throw
    }

    @Test
    void syncUsesConfiguredTokenWhenRequestTokenMissing() throws Exception {
        stubIssue(issue1, 1, "t", false, GHIssueState.OPEN);
        when(gitHubClient.getRepository("cfg-tok", "octocat/hello-world")).thenReturn(repository);
        when(gitHubClient.listAllIssues(repository)).thenReturn(List.of(issue1));
        when(taskRepository.findById("GH-1")).thenReturn(Optional.empty());
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));
        when(syncedRepositoryRepository.findByOwnerAndRepo("octocat", "hello-world"))
                .thenReturn(Optional.of(new SyncedRepository()));

        SyncResultDto result = service("cfg-tok").fetchTasksFromRepo("octocat", "hello-world", null);

        assertThat(result.imported()).isEqualTo(1);
        verify(gitHubClient).getRepository("cfg-tok", "octocat/hello-world");
    }

    @Test
    void unknownRepositoryMapsTo404() throws Exception {
        when(gitHubClient.getRepository("tok", "octocat/missing"))
                .thenThrow(new GHFileNotFoundException("not found"));

        assertThatThrownBy(() -> service("").fetchTasksFromRepo("octocat", "missing", "tok"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.NOT_FOUND));
    }

    @Test
    void githubIoErrorMapsTo502() throws Exception {
        when(gitHubClient.getRepository("tok", "octocat/hello-world"))
                .thenThrow(new IOException("connection reset"));

        assertThatThrownBy(() -> service("").fetchTasksFromRepo("octocat", "hello-world", "tok"))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_GATEWAY));
    }

    @Test
    void requestTokenTakesPrecedenceOverConfigured() throws Exception {
        when(gitHubClient.getRepository("req-tok", "octocat/hello-world")).thenReturn(repository);
        when(gitHubClient.listAllIssues(repository)).thenReturn(List.of());
        when(syncedRepositoryRepository.findByOwnerAndRepo("octocat", "hello-world"))
                .thenReturn(Optional.of(new SyncedRepository()));
        service("cfg-tok").fetchTasksFromRepo("octocat", "hello-world", "req-tok");
        verify(gitHubClient).getRepository(eq("req-tok"), eq("octocat/hello-world"));
        verify(gitHubClient, never()).getRepository(eq("cfg-tok"), anyString());
    }
}
