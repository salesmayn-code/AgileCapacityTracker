package com.agile.capacity.auth;

import com.agile.capacity.dto.Dtos.LoginRequest;
import com.agile.capacity.dto.Dtos.LoginResponse;
import com.agile.capacity.dto.Dtos.UserDto;
import com.agile.capacity.entity.User;
import com.agile.capacity.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if ("PENDING_SET_BY_ADMIN".equals(user.getPasswordHash())
                || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        String token = jwtService.issue(user.getId(), user.getEmail(), user.getRole());
        return new LoginResponse(token,
                Instant.now().getEpochSecond() + jwtService.ttlSeconds(),
                toDto(user));
    }

    /** Resolves the authenticated user from the JWT subject (user id). */
    public User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getPrincipal() == null || "anonymousUser".equals(auth.getPrincipal())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        Long userId = (Long) auth.getPrincipal();
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User no longer exists"));
    }

    public UserDto me() {
        return toDto(currentUser());
    }

    /** Phase 11 self-service profile update; email and role stay admin-managed. */
    @org.springframework.transaction.annotation.Transactional
    public UserDto updateProfile(com.agile.capacity.dto.Dtos.ProfileUpdateRequest request) {
        User user = currentUser();
        if (request.username() == null || request.username().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "username is required");
        }
        user.setUsername(request.username());
        user.setGithubUsername(request.githubUsername());
        user.setDailyCapacityHours(request.dailyCapacityHours());
        return toDto(userRepository.save(user));
    }

    /** Phase 11 self-service password change; verifies the current password first. */
    @org.springframework.transaction.annotation.Transactional
    public void changePassword(com.agile.capacity.dto.Dtos.PasswordChangeRequest request) {
        User user = currentUser();
        if ("PENDING_SET_BY_ADMIN".equals(user.getPasswordHash())
                || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
    }

    private UserDto toDto(User user) {
        return new UserDto(user.getId(), user.getUsername(), user.getEmail(), user.getRole(),
                user.getGithubUsername(), user.getDailyCapacityHours());
    }
}
