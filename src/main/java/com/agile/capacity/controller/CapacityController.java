package com.agile.capacity.controller;

import com.agile.capacity.entity.User;
import com.agile.capacity.service.CapacityService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Map;

@RestController
@RequestMapping("/api/capacity")
public class CapacityController {
    @Autowired
    private CapacityService capacityService;

    @GetMapping("/workload")
    public Map<User, Integer> getWorkload() {
        return capacityService.calculateWorkload();
    }
}