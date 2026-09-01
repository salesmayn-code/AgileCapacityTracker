package com.agile.capacity.repository;

import com.agile.capacity.entity.Sprint;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SprintRepository extends JpaRepository<Sprint, Long> {
}