package com.agile.capacity.controller;

import com.agile.capacity.auth.AuthService;
import com.agile.capacity.dto.Dtos.LoginRequest;
import com.agile.capacity.dto.Dtos.LoginResponse;
import com.agile.capacity.dto.Dtos.PasswordChangeRequest;
import com.agile.capacity.dto.Dtos.ProfileUpdateRequest;
import com.agile.capacity.dto.Dtos.UserDto;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserDto me() {
        return authService.me();
    }

    /** Self-service profile update (username, github username, daily capacity). */
    @PutMapping("/me")
    public UserDto updateMe(@Valid @RequestBody ProfileUpdateRequest request) {
        return authService.updateProfile(request);
    }

    /** Self-service password change (requires current password). */
    @PostMapping("/password")
    public void changePassword(@Valid @RequestBody PasswordChangeRequest request) {
        authService.changePassword(request);
    }
}
