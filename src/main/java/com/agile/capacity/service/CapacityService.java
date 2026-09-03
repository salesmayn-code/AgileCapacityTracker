package com.agile.capacity.service;

import com.agile.capacity.dto.Dtos.WorkloadDto;
import com.agile.capacity.entity.Task;
import com.agile.capacity.entity.User;
import com.agile.capacity.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CapacityService {
    @Autowired
    private UserRepository userRepository;

    public List<WorkloadDto> getWorkload() {
        return userRepository.findAll().stream()
                .map(user -> new WorkloadDto(
                        user.getId(),
                        user.getUsername(),
                        user.getRole(),
                        user.getDailyCapacityHours(),
                        user.getDailyCapacityHours() * 10,
                        user.getTasks().stream().mapToInt(Task::getEstimatedHours).sum()
                ))
                .collect(Collectors.toList());
    }
}
