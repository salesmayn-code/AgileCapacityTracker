package com.agile.capacity.config;

import com.agile.capacity.entity.User;
import com.agile.capacity.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

/**
 * Idempotently ensures the bootstrap admin account exists at startup using
 * ADMIN_EMAIL/ADMIN_PASSWORD env vars. Never logs the password.
 */
@Configuration
public class BootstrapAdminRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapAdminRunner.class);

    @Bean
    ApplicationRunner bootstrapAdmin(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.auth.bootstrap-admin.email:}") String email,
            @Value("${app.auth.bootstrap-admin.password:}") String password) {
        return args -> {
            if (email.isBlank() || password.isBlank()) {
                log.info("Bootstrap admin not configured (ADMIN_EMAIL/ADMIN_PASSWORD absent) - skipping");
                return;
            }
            Optional<User> existing = userRepository.findByEmail(email);
            if (existing.isPresent()) {
                User admin = existing.get();
                if (!"admin".equals(admin.getRole())
                        || "PENDING_SET_BY_ADMIN".equals(admin.getPasswordHash())) {
                    admin.setRole("admin");
                    admin.setPasswordHash(passwordEncoder.encode(password));
                    userRepository.save(admin);
                    log.info("Bootstrap admin '{}' updated (role/password normalized)", email);
                } else {
                    log.info("Bootstrap admin '{}' already configured", email);
                }
                return;
            }
            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail(email);
            admin.setRole("admin");
            admin.setPasswordHash(passwordEncoder.encode(password));
            admin.setDailyCapacityHours(8);
            userRepository.save(admin);
            log.info("Bootstrap admin '{}' created", email);
        };
    }
}
