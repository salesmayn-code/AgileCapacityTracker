package com.agile.capacity.repository;

import com.agile.capacity.entity.SyncedRepository;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SyncedRepositoryRepository extends JpaRepository<SyncedRepository, Long> {
    Optional<SyncedRepository> findByOwnerAndRepo(String owner, String repo);
}
