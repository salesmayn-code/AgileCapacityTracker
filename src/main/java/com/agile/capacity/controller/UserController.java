package com.agile.capacity.controller;

import com.agile.capacity.dto.Dtos.UserDto;
import com.agile.capacity.dto.Dtos.UserRequest;
import com.agile.capacity.service.TrackerService;
import org.springframework.http.HttpStatus;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final TrackerService trackerService;

    public UserController(TrackerService trackerService) {
        this.trackerService = trackerService;
    }

    @GetMapping
    public List<UserDto> list() {
        return trackerService.listUsers();
    }

    @GetMapping("/{id}")
    public UserDto get(@PathVariable Long id) {
        return trackerService.getUser(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserDto create(@Valid @RequestBody UserRequest request) {
        return trackerService.createUser(request);
    }

    @PutMapping("/{id}")
    public UserDto update(@PathVariable Long id, @Valid @RequestBody UserRequest request) {
        return trackerService.updateUser(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        trackerService.deleteUser(id);
    }
}
