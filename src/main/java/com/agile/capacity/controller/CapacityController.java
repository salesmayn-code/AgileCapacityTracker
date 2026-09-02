package com.agile.capacity.controller;

import com.agile.capacity.dto.Dtos.WorkloadDto;
import com.agile.capacity.service.CapacityService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/capacity")
public class CapacityController {
    private final CapacityService capacityService;

    public CapacityController(CapacityService capacityService) {
        this.capacityService = capacityService;
    }

    @GetMapping("/workload")
    public List<WorkloadDto> getWorkload() {
        return capacityService.getWorkload();
    }
}
