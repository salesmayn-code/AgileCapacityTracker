package com.agile.capacity.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/** A repository that has been synced; the auto-sync scheduler re-syncs these. */
@Entity
@Table(name = "synced_repository",
        uniqueConstraints = @UniqueConstraint(name = "uk_synced_repository", columnNames = {"owner", "repo"}))
public class SyncedRepository {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String owner;

    @Column(nullable = false)
    private String repo;

    @Column(name = "last_synced_at")
    private Instant lastSyncedAt;

    @Column(name = "last_result")
    private String lastResult;

    /** SUCCESS or FAILED. */
    @Column(name = "last_status", nullable = false)
    private String lastStatus = "SUCCESS";

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Long getId() { return id; }
    public String getOwner() { return owner; }
    public void setOwner(String owner) { this.owner = owner; }
    public String getRepo() { return repo; }
    public void setRepo(String repo) { this.repo = repo; }
    public Instant getLastSyncedAt() { return lastSyncedAt; }
    public void setLastSyncedAt(Instant lastSyncedAt) { this.lastSyncedAt = lastSyncedAt; }
    public String getLastResult() { return lastResult; }
    public void setLastResult(String lastResult) { this.lastResult = lastResult; }
    public String getLastStatus() { return lastStatus; }
    public void setLastStatus(String lastStatus) { this.lastStatus = lastStatus; }
    public Instant getCreatedAt() { return createdAt; }
}
