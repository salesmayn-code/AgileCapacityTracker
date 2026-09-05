package com.agile.capacity.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;

/** Daily remaining-hours snapshot per sprint — the real burndown history. */
@Entity
@Table(name = "sprint_snapshot",
        uniqueConstraints = @UniqueConstraint(name = "uk_snapshot_sprint_date", columnNames = {"sprint_id", "snapshot_date"}))
public class SprintSnapshot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "sprint_id", nullable = false)
    private Sprint sprint;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "remaining_hours", nullable = false)
    private int remainingHours;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Long getId() { return id; }
    public Sprint getSprint() { return sprint; }
    public void setSprint(Sprint sprint) { this.sprint = sprint; }
    public LocalDate getSnapshotDate() { return snapshotDate; }
    public void setSnapshotDate(LocalDate snapshotDate) { this.snapshotDate = snapshotDate; }
    public int getRemainingHours() { return remainingHours; }
    public void setRemainingHours(int remainingHours) { this.remainingHours = remainingHours; }
    public Instant getCreatedAt() { return createdAt; }
}
