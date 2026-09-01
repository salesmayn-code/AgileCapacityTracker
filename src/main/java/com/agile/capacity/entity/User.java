package com.agile.capacity.entity;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false)
    private String role; // Admin, Team Lead, Developer

    @Column(name = "daily_capacity_hours")
    private int dailyCapacityHours;

    @OneToMany(mappedBy = "assignedUser", cascade = CascadeType.ALL)
    private List<Task> tasks;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public int getDailyCapacityHours() { return dailyCapacityHours; }
    public void setDailyCapacityHours(int dailyCapacityHours) { this.dailyCapacityHours = dailyCapacityHours; }
    public List<Task> getTasks() { return tasks; }
    public void setTasks(List<Task> tasks) { this.tasks = tasks; }
}