package com.agile.capacity.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "team_settings")
public class TeamSettings {
    @Id
    private Long id;

    @Column(name = "working_hours_per_day", nullable = false)
    private int workingHoursPerDay;

    /** manual | hourly | daily — drives the scheduled auto-sync (Phase 11). */
    @Column(name = "sync_frequency", nullable = false)
    private String syncFrequency = "manual";

    /** Team-level alert toggles shown in Settings; gate dashboard badges. */
    @Column(name = "capacity_alerts_enabled", nullable = false)
    private boolean capacityAlertsEnabled = true;

    @Column(name = "underallocation_alerts_enabled", nullable = false)
    private boolean underallocationAlertsEnabled = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public int getWorkingHoursPerDay() { return workingHoursPerDay; }
    public void setWorkingHoursPerDay(int workingHoursPerDay) { this.workingHoursPerDay = workingHoursPerDay; }
    public String getSyncFrequency() { return syncFrequency; }
    public void setSyncFrequency(String syncFrequency) { this.syncFrequency = syncFrequency; }
    public boolean isCapacityAlertsEnabled() { return capacityAlertsEnabled; }
    public void setCapacityAlertsEnabled(boolean capacityAlertsEnabled) { this.capacityAlertsEnabled = capacityAlertsEnabled; }
    public boolean isUnderallocationAlertsEnabled() { return underallocationAlertsEnabled; }
    public void setUnderallocationAlertsEnabled(boolean underallocationAlertsEnabled) { this.underallocationAlertsEnabled = underallocationAlertsEnabled; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
