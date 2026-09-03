package com.agile.capacity.controller;

import com.agile.capacity.dto.Dtos.PageDto;
import com.agile.capacity.dto.Dtos.SprintDto;
import com.agile.capacity.dto.Dtos.SprintRequest;
import com.agile.capacity.service.TrackerService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sprints")
public class SprintController {
    private final TrackerService trackerService;

    public SprintController(TrackerService trackerService) {
        this.trackerService = trackerService;
    }

    @GetMapping
    public PageDto<SprintDto> list(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return trackerService.listSprints(page, size);
    }

    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD')")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SprintDto create(@Valid @RequestBody SprintRequest request) {
        return trackerService.createSprint(request);
    }

    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD')")
    @PutMapping("/{id}")
    public SprintDto update(@PathVariable Long id, @Valid @RequestBody SprintRequest request) {
        return trackerService.updateSprint(id, request);
    }

    @PreAuthorize("hasAnyRole('ADMIN','TEAM_LEAD')")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        trackerService.deleteSprint(id);
    }
}
