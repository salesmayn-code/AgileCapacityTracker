-- V4: shared team settings (Phase 9 - capacity engine v2).
-- Single row (id = 1) seeded with the previous browser default of 8h/day.
CREATE TABLE team_settings (
    id BIGINT PRIMARY KEY,
    working_hours_per_day INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO team_settings (id, working_hours_per_day) VALUES (1, 8);
