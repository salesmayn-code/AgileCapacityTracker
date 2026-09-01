package com.agile.capacity.service;

import com.agile.capacity.entity.Task;
import com.agile.capacity.entity.User;
import com.agile.capacity.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CapacityService {
    @Autowired
    private UserRepository userRepository;

    public Map<User, Integer> calculateWorkload() {
        return userRepository.findAll().stream()
                .collect(Collectors.toMap(
                        user -> user,
                        user -> user.getTasks().stream().mapToInt(Task::getEstimatedHours).sum()
                ));
    }
}