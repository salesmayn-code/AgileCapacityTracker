package com.agile.capacity.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Phase 11 rate limiting (in-memory sliding window; single-instance by design —
 * documented for a future shared store if we ever scale past one App Runner).
 *  - POST /api/auth/login: 5 requests / minute / client IP
 *  - POST /api/github/sync/**: 2 requests / minute / authenticated user
 * Limits are property-tunable (tests raise them so the shared context never 429s).
 * Exceeded limits return 429 with the standard JSON error body.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final long WINDOW_MS = 60_000L;

    private final Map<String, Deque<Long>> loginByIp = new ConcurrentHashMap<>();
    private final Map<String, Deque<Long>> syncByUser = new ConcurrentHashMap<>();

    @Value("${app.ratelimit.login-per-minute:5}")
    private int loginLimit;

    @Value("${app.ratelimit.sync-per-minute:2}")
    private int syncLimit;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();

        if ("POST".equals(method) && path.startsWith("/api/auth/login")) {
            if (!tryAcquire(loginByIp, clientIp(request), loginLimit)) {
                write429(response, "Too many login attempts; wait a minute and try again");
                return;
            }
        } else if ("POST".equals(method) && path.startsWith("/api/github/sync/")) {
            String key = "user:" + currentUserId();
            if (!tryAcquire(syncByUser, key, syncLimit)) {
                write429(response, "GitHub sync rate limit exceeded; try again in a minute");
                return;
            }
        }
        chain.doFilter(request, response);
    }

    /** Sliding window: records now, evicts entries older than the window, allows if under the cap. */
    static boolean tryAcquire(Map<String, Deque<Long>> windows, String key, int limit) {
        long now = System.currentTimeMillis();
        Deque<Long> hits = windows.computeIfAbsent(key, k -> new ArrayDeque<>());
        synchronized (hits) {
            while (!hits.isEmpty() && now - hits.peekFirst() >= WINDOW_MS) {
                hits.pollFirst();
            }
            if (hits.size() >= limit) {
                return false;
            }
            hits.addLast(now);
            return true;
        }
    }

    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Long userId) {
            return String.valueOf(userId);
        }
        return "anonymous";
    }

    private void write429(HttpServletResponse response, String message) throws IOException {
        response.setStatus(429);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write("""
                {"timestamp":"%s","status":429,"error":"Too Many Requests","message":"%s"}
                """.formatted(Instant.now(), message));
    }
}
