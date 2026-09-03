package com.agile.capacity.controller;

import com.agile.capacity.dto.Dtos.PageDto;
import com.agile.capacity.dto.Dtos.TaskDto;
import com.agile.capacity.dto.Dtos.TaskRequest;
import com.agile.capacity.service.TrackerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TrackerService trackerService;

    public TaskController(TrackerService trackerService) {
        this.trackerService = trackerService;
    }

    @GetMapping
    public PageDto<TaskDto> list(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return trackerService.listTasks(page, size);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskDto create(@Valid @RequestBody TaskRequest request) {
        return trackerService.createTask(request);
    }

    @PutMapping("/{id}")
    public TaskDto update(@PathVariable String id, @Valid @RequestBody TaskRequest request) {
        return trackerService.updateTask(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        trackerService.deleteTask(id);
    }
}
