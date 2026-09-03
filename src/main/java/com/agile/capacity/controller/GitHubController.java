package com.agile.capacity.controller;

import com.agile.capacity.dto.Dtos.SyncResultDto;
import com.agile.capacity.service.GitHubService;
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
     * The frontend may pass its GitHub token per request via the Authorization
     * header (as "Authorization: Bearer &lt;token&gt;"); if absent, the server's
     * configured GITHUB_API_TOKEN is used.
     */
    @PostMapping("/sync/{owner}/{repo}")
    public SyncResultDto syncTasks(
            @PathVariable("owner") String owner,
            @PathVariable("repo") String repo,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        String requestToken = null;
        if (authorization != null && authorization.startsWith("Bearer ")) {
            requestToken = authorization.substring("Bearer ".length());
        }
        return gitHubService.fetchTasksFromRepo(owner, repo, requestToken);
    }
}
