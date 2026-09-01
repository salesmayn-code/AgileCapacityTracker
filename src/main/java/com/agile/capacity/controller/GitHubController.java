package com.agile.capacity.controller;

import com.agile.capacity.entity.Task;
import com.agile.capacity.service.GitHubService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/github")
public class GitHubController {
    @Autowired
    private GitHubService gitHubService;

    @PostMapping("/sync/{repo}")
    public List<Task> syncTasks(@PathVariable String repo) throws IOException {
        return gitHubService.fetchTasksFromRepo(repo);
    }
}