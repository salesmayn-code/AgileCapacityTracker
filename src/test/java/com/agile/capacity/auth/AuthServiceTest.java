package com.agile.capacity.auth;

import com.agile.capacity.dto.Dtos.LoginRequest;
import com.agile.capacity.dto.Dtos.LoginResponse;
import com.agile.capacity.entity.User;
import com.agile.capacity.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    private final JwtService jwtService = new JwtService("test-jwt-secret-0123456789abcdef-0123");
    private AuthService authService;
    private User user;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService);
        user = new User();
        user.setId(7L);
        user.setUsername("alice");
        user.setEmail("alice@example.com");
        user.setRole("team_lead");
        user.setDailyCapacityHours(8);
        SecurityContextHolder.clearContext();
    }

    @Test
    void loginWithValidCredentialsReturnsTokenAndUser() {
        user.setPasswordHash("encoded");
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secret", "encoded")).thenReturn(true);

        LoginResponse response = authService.login(new LoginRequest("alice@example.com", "secret"));

        assertThat(response.token()).isNotBlank();
        assertThat(response.user().username()).isEqualTo("alice");
        assertThat(response.user().role()).isEqualTo("team_lead");
        assertThat(response.expiresAtEpochSeconds()).isGreaterThan(System.currentTimeMillis() / 1000);
    }

    @Test
    void loginWithUnknownEmailReturns401() {
        when(userRepository.findByEmail("ghost@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("ghost@example.com", "x")))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void loginWithWrongPasswordReturns401() {
        user.setPasswordHash("encoded");
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong", "encoded")).thenReturn(false);

        assertThatThrownBy(() -> authService.login(new LoginRequest("alice@example.com", "wrong")))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void loginWithPendingPasswordReturns401() {
        user.setPasswordHash("PENDING_SET_BY_ADMIN");
        when(userRepository.findByEmail("alice@example.com")).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> authService.login(new LoginRequest("alice@example.com", "anything")))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }

    @Test
    void meResolvesCurrentUserFromSecurityContext() {
        user.setPasswordHash("encoded");
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
        when(authentication.getPrincipal()).thenReturn(7L);
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));

        assertThat(authService.me().username()).isEqualTo("alice");
    }

    @Test
    void meWithoutAuthenticationReturns401() {
        assertThatThrownBy(() -> authService.me())
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(e -> assertThat(((ResponseStatusException) e).getStatusCode())
                        .isEqualTo(HttpStatus.UNAUTHORIZED));
    }
}
