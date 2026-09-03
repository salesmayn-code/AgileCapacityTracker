package com.agile.capacity.controller;

import com.agile.capacity.dto.Dtos.SyncResultDto;
import com.agile.capacity.service.GitHubService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/github")
public class GitHubController {
    private final GitHubService gitHubService;

    public GitHubController(GitHubService gitHubService) {
        this.gitHubService = gitHubService;
    }

    /**
     * Syncs open issues from a repository as tasks. The repo is addressed as two
     * path segments ({@code owner} and {@code repo}) because a slash inside a
     * single path variable is a segment separator.
     * The frontend may pass its GitHub token per request via the X-GitHub-Token
     * header (the Authorization header is reserved for the session JWT); if
     * absent, the server's configured GITHUB_API_TOKEN is used.
     */
    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD')")
    @PostMapping("/sync/{owner}/{repo}")
    public SyncResultDto syncTasks(
            @PathVariable("owner") String owner,
            @PathVariable("repo") String repo,
            @RequestHeader(value = "X-GitHub-Token", required = false) String gitHubToken) {
        return gitHubService.fetchTasksFromRepo(owner, repo, gitHubToken);
    }
}
