package com.agile.capacity.service;

import com.agile.capacity.entity.Task;
import org.kohsuke.github.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GitHubService {
    @Value("${github.api.token}")
    private String token;

    public List<Task> fetchTasksFromRepo(String repoName) throws IOException {
        GitHub github = new GitHubBuilder().withOAuthToken(token).build();
        GHRepository repo = github.getRepository(repoName);
        return repo.getIssues(GHIssueState.ALL).stream()
                .map(issue -> {
                    Task task = new Task();
                    task.setId("GH-" + issue.getId());
                    task.setTitle(issue.getTitle());
                    return task;
                })
                .collect(Collectors.toList());
    }
}