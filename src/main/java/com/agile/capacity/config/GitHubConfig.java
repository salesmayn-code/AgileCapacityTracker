package com.agile.capacity.config;

import com.agile.capacity.github.GitHubClient;
import com.agile.capacity.util.TaskIdGenerator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GitHubConfig {

    @Bean
    public GitHubClient gitHubClient() {
        return GitHubClient.defaultClient();
    }

    @Bean
    public TaskIdGenerator taskIdGenerator() {
        return new TaskIdGenerator();
    }
}
