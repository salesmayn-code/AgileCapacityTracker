package com.agile.capacity.controller;

import com.agile.capacity.dto.Dtos.PageDto;
import com.agile.capacity.dto.Dtos.UserDto;
import com.agile.capacity.dto.Dtos.UserRequest;
import com.agile.capacity.service.TrackerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
public class UserController {
    private final TrackerService trackerService;

    public UserController(TrackerService trackerService) {
        this.trackerService = trackerService;
    }

    @GetMapping
    public PageDto<UserDto> list(
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size) {
        return trackerService.listUsers(page, size);
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
