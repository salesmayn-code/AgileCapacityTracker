package com.agile.capacity.github;

import org.kohsuke.github.GHIssue;
import org.kohsuke.github.GHIssueState;
import org.kohsuke.github.GHRepository;
import org.kohsuke.github.GitHub;
import org.kohsuke.github.GitHubBuilder;

import java.io.IOException;

/**
 * Thin wrapper over the kohsuke GitHub API so sync logic is unit-testable
 * without live GitHub access.
 */
public interface GitHubClient {
    GHRepository getRepository(String token, String ownerAndRepo) throws IOException;

    Iterable<GHIssue> listOpenIssues(GHRepository repo) throws IOException;

    static GitHubClient defaultClient() {
        return new GitHubClient() {
            @Override
            public GHRepository getRepository(String token, String ownerAndRepo) throws IOException {
                GitHub github = new GitHubBuilder().withOAuthToken(token).build();
                return github.getRepository(ownerAndRepo);
            }

            @Override
            public Iterable<GHIssue> listOpenIssues(GHRepository repo) throws IOException {
                return repo.getIssues(GHIssueState.OPEN);
            }
        };
    }
}
