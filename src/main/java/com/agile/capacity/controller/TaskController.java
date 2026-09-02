package com.agile.capacity.controller;

import com.agile.capacity.dto.Dtos.TaskDto;
import com.agile.capacity.dto.Dtos.TaskRequest;
import com.agile.capacity.service.TrackerService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TrackerService trackerService;

    public TaskController(TrackerService trackerService) {
        this.trackerService = trackerService;
    }

    @GetMapping
    public List<TaskDto> list() {
        return trackerService.listTasks();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TaskDto create(@RequestBody TaskRequest request) {
        return trackerService.createTask(request);
    }

    @PutMapping("/{id}")
    public TaskDto update(@PathVariable String id, @RequestBody TaskRequest request) {
        return trackerService.updateTask(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        trackerService.deleteTask(id);
    }
}
