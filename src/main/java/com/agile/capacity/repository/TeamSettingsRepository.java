package com.agile.capacity.repository;

import com.agile.capacity.entity.TeamSettings;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TeamSettingsRepository extends JpaRepository<TeamSettings, Long> {

    /** The single settings row is always id 1 (seeded by V4). */
    Long SINGLETON_ID = 1L;
}
