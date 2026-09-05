package com.agile.capacity.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Phase 11 observability: assigns a short correlation id to every request
 * (MDC "requestId" -> structured logs; X-Request-Id response header) and
 * logs method/path/status/duration at INFO.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {
    private static final Logger log = LoggerFactory.getLogger(RequestIdFilter.class);
    private static final String HEADER = "X-Request-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String requestId = request.getHeader(HEADER);
        if (requestId == null || requestId.isBlank() || requestId.length() > 64) {
            requestId = UUID.randomUUID().toString().substring(0, 8);
        }
        long start = System.currentTimeMillis();
        try {
            MDC.put("requestId", requestId);
            response.setHeader(HEADER, requestId);
            chain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            long duration = System.currentTimeMillis() - start;
            log.info("{} {} -> {} ({} ms)", request.getMethod(), request.getRequestURI(), status, duration);
            MDC.remove("requestId");
        }
    }
}
