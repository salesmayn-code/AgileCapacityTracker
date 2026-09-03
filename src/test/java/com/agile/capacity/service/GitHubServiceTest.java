package com.agile.capacity.service;

import com.agile.capacity.dto.Dtos.SyncResultDto;
import com.agile.capacity.dto.Dtos.TaskDto;
import com.agile.capacity.entity.Task;
import com.agile.capacity.github.GitHubClient;
import com.agile.capacity.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.kohsuke.github.GHFileNotFoundException;
import org.kohsuke.github.GHIssue;
import org.kohsuke.github.GHRepository;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
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
        GitHubService s = new GitHubService(taskRepository, gitHubClient);
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
        when(issue1.getNumber()).thenReturn(11);
        when(issue1.getTitle()).thenReturn("Fix login bug");
        when(issue1.isPullRequest()).thenReturn(false);
        when(issue2.getNumber()).thenReturn(12);
        when(issue2.getTitle()).thenReturn("Add docs");
        when(issue2.isPullRequest()).thenReturn(false);
        when(pullRequest.isPullRequest()).thenReturn(true);
        when(gitHubClient.getRepository("tok", "octocat/hello-world")).thenReturn(repository);
        when(gitHubClient.listOpenIssues(repository)).thenReturn(List.of(issue1, issue2, pullRequest));
        when(taskRepository.findById(anyString())).thenReturn(Optional.empty());
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        SyncResultDto result = service("").fetchTasksFromRepo("octocat", "hello-world", "tok");

        assertThat(result.imported()).isEqualTo(2);
        assertThat(result.skipped()).isEqualTo(1);
        assertThat(result.tasks()).hasSize(2);
        TaskDto first = result.tasks().get(0);
        assertThat(first.id()).isEqualTo("GH-11");
        assertThat(first.title()).isEqualTo("Fix login bug");
        assertThat(first.estimatedHours()).isZero();
        assertThat(first.status()).isEqualTo("open");
    }

    @Test
    void syncIsIdempotentAndPreservesEstimatesOnExistingTasks() throws Exception {
        // issue 11 was synced before and a human set hours=8, status=in_progress
        Task existing = existingTask("GH-11", "Old title", 8, "in_progress");
        when(issue1.getNumber()).thenReturn(11);
        when(issue1.getTitle()).thenReturn("New title");
        when(issue1.isPullRequest()).thenReturn(false);
        when(gitHubClient.getRepository("tok", "octocat/hello-world")).thenReturn(repository);
        when(gitHubClient.listOpenIssues(repository)).thenReturn(List.of(issue1));
        when(taskRepository.findById("GH-11")).thenReturn(Optional.of(existing));
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

        SyncResultDto result = service("").fetchTasksFromRepo("octocat", "hello-world", "tok");

        assertThat(result.imported()).isEqualTo(1);
        TaskDto dto = result.tasks().get(0);
        assertThat(dto.id()).isEqualTo("GH-11");
        assertThat(dto.title()).isEqualTo("New title");          // refreshed
        assertThat(dto.estimatedHours()).isEqualTo(8);           // preserved
        assertThat(dto.status()).isEqualTo("in_progress");       // preserved
    }

    @Test
    void syncUsesConfiguredTokenWhenRequestTokenMissing() throws Exception {
        when(issue1.getNumber()).thenReturn(1);
        when(issue1.getTitle()).thenReturn("t");
        when(issue1.isPullRequest()).thenReturn(false);
        when(gitHubClient.getRepository("cfg-tok", "octocat/hello-world")).thenReturn(repository);
        when(gitHubClient.listOpenIssues(repository)).thenReturn(List.of(issue1));
        when(taskRepository.findById("GH-1")).thenReturn(Optional.empty());
        when(taskRepository.save(any(Task.class))).thenAnswer(inv -> inv.getArgument(0));

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
        when(gitHubClient.listOpenIssues(repository)).thenReturn(List.of());
        service("cfg-tok").fetchTasksFromRepo("octocat", "hello-world", "req-tok");
        verify(gitHubClient).getRepository(eq("req-tok"), eq("octocat/hello-world"));
        verify(gitHubClient, never()).getRepository(eq("cfg-tok"), anyString());
    }
}
