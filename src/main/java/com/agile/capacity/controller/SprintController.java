package com.agile.capacity.controller;

import com.agile.capacity.dto.Dtos.SprintDto;
import com.agile.capacity.dto.Dtos.SprintRequest;
import com.agile.capacity.service.TrackerService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sprints")
public class SprintController {
    private final TrackerService trackerService;

    public SprintController(TrackerService trackerService) {
        this.trackerService = trackerService;
    }

    @GetMapping
    public List<SprintDto> list() {
        return trackerService.listSprints();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SprintDto create(@RequestBody SprintRequest request) {
        return trackerService.createSprint(request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        trackerService.deleteSprint(id);
    }
}
