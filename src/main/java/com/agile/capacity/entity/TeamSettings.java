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
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
