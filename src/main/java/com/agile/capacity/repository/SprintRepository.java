package com.agile.capacity.repository;

import com.agile.capacity.entity.Sprint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SprintRepository extends JpaRepository<Sprint, Long> {

    /**
     * Grouped task count + estimated-hours sum per sprint.
     * Sprints with no tasks are absent from the result (callers default to 0).
     */
    @Query("select t.sprint.id as sprintId, count(t) as taskCount, coalesce(sum(t.estimatedHours), 0) as totalHours " +
           "from Task t where t.sprint is not null group by t.sprint.id")
    List<SprintStats> aggregateSprintStats();
}
