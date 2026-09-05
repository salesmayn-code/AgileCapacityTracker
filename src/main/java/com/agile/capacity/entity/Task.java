package com.agile.capacity.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
public class Task {
    @Id
    private String id; // assigned: "T-<uuid8>" for manual tasks, "GH-<issueNumber>" for synced tasks

    private String title;
    private int estimatedHours;
    private String status;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User assignedUser;

    @ManyToOne
    @JoinColumn(name = "sprint_id")
    private Sprint sprint;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** GitHub issue URL for synced tasks (GH-*); null for manual tasks. */
    @Column(name = "issue_url")
    private String issueUrl;

    /** When the underlying GitHub issue closed (synced tasks only). */
    @Column(name = "github_closed_at")
    private Instant githubClosedAt;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public int getEstimatedHours() { return estimatedHours; }
    public void setEstimatedHours(int estimatedHours) { this.estimatedHours = estimatedHours; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public User getAssignedUser() { return assignedUser; }
    public void setAssignedUser(User assignedUser) { this.assignedUser = assignedUser; }
    public Sprint getSprint() { return sprint; }
    public void setSprint(Sprint sprint) { this.sprint = sprint; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public String getIssueUrl() { return issueUrl; }
    public void setIssueUrl(String issueUrl) { this.issueUrl = issueUrl; }
    public Instant getGithubClosedAt() { return githubClosedAt; }
    public void setGithubClosedAt(Instant githubClosedAt) { this.githubClosedAt = githubClosedAt; }
}
