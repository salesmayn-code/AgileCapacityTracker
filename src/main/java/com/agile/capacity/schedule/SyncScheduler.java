package com.agile.capacity.schedule;

import com.agile.capacity.entity.SyncedRepository;
import com.agile.capacity.repository.SyncedRepositoryRepository;
import com.agile.capacity.service.GitHubService;
import com.agile.capacity.service.TrackerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Phase 11 auto-sync: re-syncs every remembered repository using the server's
 * GITHUB_API_TOKEN, per the team's syncFrequency setting.
 *  - hourly: every hour on the hour
 *  - daily:  once at 06:00 UTC
 *  - manual: never (the setting is still stored; manual sync stays on the page)
 * One failing repo never stops the rest (GitHubService.autoSync swallows).
 */
@Component
public class SyncScheduler {
    private static final Logger log = LoggerFactory.getLogger(SyncScheduler.class);

    private final SyncedRepositoryRepository syncedRepositoryRepository;
    private final GitHubService gitHubService;
    private final TrackerService trackerService;

    public SyncScheduler(SyncedRepositoryRepository syncedRepositoryRepository,
                         GitHubService gitHubService, TrackerService trackerService) {
        this.syncedRepositoryRepository = syncedRepositoryRepository;
        this.gitHubService = gitHubService;
        this.trackerService = trackerService;
    }

    @Scheduled(cron = "0 0 * * * *")
    public void hourly() {
        if ("hourly".equals(trackerService.getTeamSettings().syncFrequency())) {
            syncAll("hourly");
        }
    }

    @Scheduled(cron = "0 0 6 * * *", zone = "UTC")
    public void daily() {
        if ("daily".equals(trackerService.getTeamSettings().syncFrequency())) {
            syncAll("daily");
        }
    }

    private void syncAll(String trigger) {
        List<SyncedRepository> repos = syncedRepositoryRepository.findAll();
        if (repos.isEmpty()) {
            return;
        }
        log.info("auto-sync ({}) starting for {} repository/repositories", trigger, repos.size());
        for (SyncedRepository repo : repos) {
            gitHubService.autoSync(repo);
        }
        log.info("auto-sync ({}) finished", trigger);
    }
}
