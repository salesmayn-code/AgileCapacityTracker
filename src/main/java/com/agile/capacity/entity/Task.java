package com.agile.capacity.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.GenericGenerator;

@Entity
public class Task {
    @Id
    @GeneratedValue(generator = "task_id_gen")
    @GenericGenerator(
            name = "task_id_gen",
            type = com.agile.capacity.util.TaskIdGenerator.class // Explicitly specify the class
    )
    private String id;

    private String title;
    private int estimatedHours;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User assignedUser;

    @ManyToOne
    @JoinColumn(name = "sprint_id")
    private Sprint sprint;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public int getEstimatedHours() { return estimatedHours; }
    public void setEstimatedHours(int estimatedHours) { this.estimatedHours = estimatedHours; }
    public User getAssignedUser() { return assignedUser; }
    public void setAssignedUser(User assignedUser) { this.assignedUser = assignedUser; }
    public Sprint getSprint() { return sprint; }
    public void setSprint(Sprint sprint) { this.sprint = sprint; }
}