package com.agile.capacity.service;

import com.agile.capacity.repository.TaskRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
class GitHubServiceTest {

    @Mock
    private TaskRepository taskRepository;

    private GitHubService gitHubService;

    private void initWithToken(String configuredToken) {
        gitHubService = new GitHubService(taskRepository);
        ReflectionTestUtils.setField(gitHubService, "configuredToken", configuredToken);
    }

    @Test
    void syncWithoutAnyTokenFailsFastWith400() {
        initWithToken("");

        assertThatThrownBy(() -> gitHubService.fetchTasksFromRepo("octocat/hello-world", null))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }

    @Test
    void syncWithBlankRequestTokenFallsBackAndFailsWhenConfigEmpty() {
        initWithToken("  ");

        assertThatThrownBy(() -> gitHubService.fetchTasksFromRepo("octocat/hello-world", "   "))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
