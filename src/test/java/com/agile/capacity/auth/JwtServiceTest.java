package com.agile.capacity.auth;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class JwtServiceTest {

    private static final String SECRET = "test-jwt-secret-0123456789abcdef-0123";

    private final JwtService jwtService = new JwtService(SECRET);

    @Test
    void issuedTokenRoundTripsClaims() {
        String token = jwtService.issue(42L, "alice@example.com", "team_lead");

        Optional<Claims> parsed = jwtService.parse(token);

        assertThat(parsed).isPresent();
        assertThat(parsed.get().getSubject()).isEqualTo("42");
        assertThat(parsed.get().get("email", String.class)).isEqualTo("alice@example.com");
        assertThat(parsed.get().get("role", String.class)).isEqualTo("team_lead");
    }

    @Test
    void garbageTokenIsRejected() {
        assertThat(jwtService.parse("not-a-token")).isEmpty();
        assertThat(jwtService.parse("")).isEmpty();
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = jwtService.issue(1L, "a@b.c", "admin");
        assertThat(jwtService.parse(token + "x")).isEmpty();
    }

    @Test
    void wrongSecretIsRejected() {
        String token = new JwtService("another-secret-0123456789abcdef-4567").issue(1L, "a@b.c", "admin");
        assertThat(jwtService.parse(token)).isEmpty();
    }
}
