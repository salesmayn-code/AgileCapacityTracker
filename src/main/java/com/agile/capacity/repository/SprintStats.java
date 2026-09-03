package com.agile.capacity.repository;

/** Grouped per-sprint task statistics (avoids N+1 lazy loading). */
public interface SprintStats {
    Long getSprintId();
    long getTaskCount();
    long getTotalHours();
}
