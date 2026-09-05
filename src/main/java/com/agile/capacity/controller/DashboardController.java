package com.agile.capacity.controller;

import com.agile.capacity.dto.Dtos.DashboardStatsDto;
import com.agile.capacity.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Phase 11: one aggregated call for the dashboard overview page. */
@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/stats")
    public DashboardStatsDto stats() {
        return dashboardService.getStats();
    }
}
