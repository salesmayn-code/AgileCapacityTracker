package com.agile.capacity.repository;

import com.agile.capacity.entity.Task;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, String> {

    /** Grouped estimated-hours sum per assigned user (workload; users with no tasks absent). */
    @Query("select t.assignedUser.id as userId, coalesce(sum(t.estimatedHours), 0) as usedHours " +
           "from Task t where t.assignedUser is not null group by t.assignedUser.id")
    List<UserStats> aggregateUserStats();

    /** Paged task listing with assignee + sprint fetched in the same query (no N+1). */
    @Override
    @EntityGraph(attributePaths = {"assignedUser", "sprint"})
    Page<Task> findAll(Pageable pageable);
}
