package com.agile.capacity.repository;

/** Grouped per-user task statistics (avoids N+1 lazy loading). */
public interface UserStats {
    Long getUserId();
    long getUsedHours();
}
