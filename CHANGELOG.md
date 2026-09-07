# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The project was remediated and productionized in 12 phases; this changelog
summarizes them by user-visible area. Detailed phase records are internal.

## [v0.1.0] — 2026-09-07

First tagged release: a full-stack agile team capacity tracker.

### Security
- Removed committed secrets from code and history (Phase 1); env-var placeholders + `.env.example` instead
- Stateless auth: Spring Security + JWT (HS256, 12h), BCrypt password hashing, role matrix (admin / team lead / developer), no self-registration (Phase 8)
- Next.js BFF proxy holds the session JWT in an httpOnly, Secure, SameSite=Strict cookie — the browser never sees the token (Phase 8)
- Rate limiting: login 5/min/IP and GitHub sync 2/min/user → JSON 429 (Phase 11)

### Added
- Team / sprint / task CRUD with validation, pagination (`PageDto` envelope), and cascades (Phases 4–7)
- GitHub issue import per repository (`POST /api/github/sync/{owner}/{repo}`): idempotent upserts as `GH-<number>` tasks, PRs skipped; re-syncs refresh title/status/URL while preserving estimates and assignees; closed issues become `done` with close dates; stale tasks flagged (>30d); synced repos remembered and auto-synced hourly/daily per team setting (Phases 6, 11)
- Capacity engine v2: weekday-based sprint length, server-side team settings, workload envelope with per-member `usedPercent`/`allocatedPercent` (Phase 9)
- Aggregated dashboard: `GET /api/dashboard/stats` — capacity %, active sprints, burndown with ideal line (daily snapshots), GitHub task counts incl. stale, recent activity, synced-repo statuses (Phase 11)
- Self-service account: profile update (`PUT /api/auth/me`) and password change (`POST /api/auth/password`) (Phase 11)
- Team settings API: working hours/day, GitHub sync frequency, capacity/underallocation alert toggles (admin-only writes) (Phases 9, 11)
- Observability: structured JSON logs with per-request `requestId` (also returned as `X-Request-Id`), Actuator health/info/metrics (Phases 10–11)
- Scheduled jobs: burndown snapshots daily 23:50 UTC; GitHub auto-sync hourly or daily 06:00 UTC (Phase 11)

### Changed
- README rewritten to reflect reality; demo credentials removed from the UI (Phase 3)
- Frontend pinned to Node 22 / pnpm 11; builds enforce lint + types (Phase 2)
- Database schema managed by Flyway (V1–V6); Hibernate validates only (Phases 7, 9, 11)

### Fixed
- GitHub sync route handling, CORS/boot-without-token, malformed-date 400s, duplicate 409s (Phase 6)
- N+1 queries via grouped aggregates + entity graphs (Phase 7)

### Infrastructure
- GitHub Actions CI: backend `mvn verify` with JaCoCo line-coverage gate (≥60%), frontend lint + coverage-gated tests (≥60%) + build (Phases 5, 12)
- Production Docker images (backend layered jar, frontend standalone, non-root) + full-stack compose with healthchecks (Phase 10)
- AWS deployment path: App Runner (backend) + Amplify (frontend) + RDS PostgreSQL, OIDC deploy pipeline that self-skips until repo variables arm it (Phase 10)
- Dependabot: weekly grouped updates for Maven, pnpm, GitHub Actions (Phase 12)
- Release workflow: tag `v*` builds the jar and publishes a GitHub Release with the artifact attached (Phase 12)
