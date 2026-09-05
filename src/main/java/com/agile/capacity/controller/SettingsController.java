package com.agile.capacity.controller;

import com.agile.capacity.dto.Dtos.TeamSettingsFullDto;
import com.agile.capacity.dto.Dtos.TeamSettingsRequest;
import com.agile.capacity.service.TrackerService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final TrackerService trackerService;

    public SettingsController(TrackerService trackerService) {
        this.trackerService = trackerService;
    }

    @GetMapping
    public TeamSettingsFullDto get() {
        return trackerService.getTeamSettings();
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public TeamSettingsFullDto update(@Valid @RequestBody TeamSettingsRequest request) {
        return trackerService.updateTeamSettings(request);
    }
}
