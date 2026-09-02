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
     * Syncs open issues from a repository (owner/name path variable) as tasks.
     * The frontend may pass its GitHub token per request via the Authorization
     * header (as "Authorization: Bearer &lt;token&gt;"); if absent, the server's
     * configured GITHUB_API_TOKEN is used.
     */
    @PostMapping("/sync/{repo}")
    public SyncResultDto syncTasks(
            @PathVariable("repo") String ownerAndRepo,
            @RequestHeader(value = "Authorization", required = false) String authorization) {
        String requestToken = null;
        if (authorization != null && authorization.startsWith("Bearer ")) {
            requestToken = authorization.substring("Bearer ".length());
        }
        return gitHubService.fetchTasksFromRepo(ownerAndRepo, requestToken);
    }
}
