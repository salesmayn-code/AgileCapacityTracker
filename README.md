# Agile Team Capacity Tracker

A full-stack application for tracking agile team capacity: manage team members, sprints, and tasks, import GitHub issues, and visualize each member's workload against their allocated capacity.

**Status: work in progress** — the frontend and backend are fully integrated (live CRUD, real authentication via the BFF proxy, and server-computed capacity data). Remaining rough edges are listed under [Known limitations](#known-limitations).

## Features

- **Team management** — create, update, and remove team members with role (`admin` / `team_lead` / `developer`), GitHub username, and daily capacity in hours. Persisted in PostgreSQL.
- **Sprint management** — create sprints with start/end dates; task count and total estimated hours are computed live from real task data.
- **Task tracking** — full CRUD for tasks with hour estimates, status (`open` / `in_progress` / …), assignee, and sprint. Deleting a member or sprint cascades to their tasks.
- **Capacity dashboard** — per-member *used vs allocated* hours and percentages, average team capacity, overallocation count, and live charts driven by the backend workload API. Sprint length is derived from sprint dates (weekdays only), all math computed server-side.
- **Real-time overview** — one aggregated `/api/dashboard/stats` call drives the overview cards, sprint burndown (ideal vs remaining, from daily snapshots), recent activity feed, and GitHub task stats. No mock data anywhere.
- **GitHub issue import & auto-sync** — sync a repository's issues (all states, PRs skipped) as tasks; closed issues become `done` with close dates and issue URLs. Every synced repo is remembered and can be re-synced automatically (hourly/daily) with stale-flagging for issues closed >30 days. Estimates and assignments are always preserved on re-sync.
- **Self-service account** — update your own profile (name, GitHub username, daily hours) and change your password from the Settings page (requires the current password).
- **Team settings** — working hours per day, GitHub sync frequency, and over/under-allocation alert toggles are shared server-side settings (admin-managed via the Settings page), driving capacity math and the scheduler for everyone.
- **Observability** — structured JSON logs with per-request IDs (`X-Request-Id`), Actuator metrics/health, and in-memory rate limiting: 5 login attempts/min/IP and 2 GitHub syncs/min/user (429 JSON errors when exceeded).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Java 17, Spring Boot 3.2, Spring Data JPA, PostgreSQL |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| GitHub integration | org.kohsuke github-api |

## Architecture

The repo holds two apps that talk over REST:

```
frontend/ (Next.js, port 3000)
    │  same-origin /api/* fetch() → Next.js BFF proxy (httpOnly cookie JWT)
    ▼
Spring Boot REST API (repo root, port 8080)
    │  Spring Data JPA
    ▼
PostgreSQL (agile_capacity)
    │  github-api (on sync)
    ▼
GitHub Issues
```

- The backend lives at the **repo root** (`pom.xml`, `src/main/java/com/agile/capacity/`); the frontend is in `frontend/` (pnpm).
- CORS on the backend is configurable via `APP_CORS_ALLOWED_ORIGINS` (default `http://localhost:3000`).
- The frontend API client is `frontend/lib/api.ts` — all dashboard pages use it; no page keeps mock data for its primary content.

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List team members (paginated: `?page=&size=`, size capped at 100) |
| GET | `/api/users/{id}` | Get one member |
| POST | `/api/users` | Create member (`username`, `role`, `email?`, `githubUsername?`, `dailyCapacityHours?`) |
| PUT | `/api/users/{id}` | Update member |
| DELETE | `/api/users/{id}` | Delete member (cascades tasks) |
| GET | `/api/sprints` | List sprints (paginated; computed task count + hours via grouped aggregates) |
| POST | `/api/sprints` | Create sprint (`name`, `startDate?`, `endDate?` ISO dates) |
| PUT | `/api/sprints/{id}` | Update sprint (dates validated: end ≥ start) |
| DELETE | `/api/sprints/{id}` | Delete sprint (cascades tasks) |
| GET | `/api/tasks` | List tasks (paginated; assignee + sprint fetched with the page — no N+1) |
| POST | `/api/tasks` | Create task (`title`, `estimatedHours?`, `status?`, `assignedUserId?`, `sprintId?`) |
| PUT | `/api/tasks/{id}` | Update task |
| DELETE | `/api/tasks/{id}` | Delete task |
| GET | `/api/capacity/workload` | Capacity envelope: `{sprintDays, sprintName, sprintActive, workingHoursPerDay, team[]}` — per-member `allocatedHours`, `usedHours`, `usedPercent`, `allocatedPercent`, all computed server-side |
| GET | `/api/dashboard/stats` | Aggregated overview: capacity %, active sprints, burndown history + ideal line, GitHub task counts, recent activity, synced-repo statuses |
| GET | `/api/settings` | Team settings (`workingHoursPerDay`, `syncFrequency`, `capacityAlertsEnabled`, `underallocationAlertsEnabled`) — any authenticated user |
| PUT | `/api/settings` | Update team settings — admin only (`workingHoursPerDay` 1–24; `syncFrequency` manual/hourly/daily; alert toggles) |
| PUT | `/api/auth/me` | Update own profile (`username`, `githubUsername?`, `dailyCapacityHours?`) — email/role admin-managed |
| POST | `/api/auth/password` | Change own password (requires `currentPassword`; 401 when wrong) |
| POST | `/api/github/sync/{owner}/{repo}` | Import a repo's issues as tasks (idempotent: existing tasks updated in place, estimates/assignee preserved; closed → `done`); optional `X-GitHub-Token` header overrides the server's `GITHUB_API_TOKEN` |
| GET | `/api/github/repos` | Repos remembered from syncs (re-synced by the scheduler) — admin/team_lead |
| DELETE | `/api/github/repos/{id}` | Remove a repo from auto-sync (tasks untouched) — admin |

## Authentication

All `/api/**` endpoints (except `POST /api/auth/login`) require a valid **JWT** in `Authorization: Bearer …`. Passwords are stored as **BCrypt** hashes. JWTs are HS256-signed with `JWT_SECRET` and expire after **12 hours**; re-login is required after expiry (no refresh tokens yet).

**Role matrix** (enforced server-side via `@PreAuthorize`):

| Operation | admin | team_lead | developer |
|---|---|---|---|
| User management (create/update/delete) | ✅ | ❌ | ❌ |
| Sprint create/update/delete | ✅ | ✅ | ❌ |
| Task CRUD | ✅ | ✅ | ✅ |
| GitHub sync | ✅ | ✅ | ❌ |
| Reads (users/sprints/tasks/workload) | ✅ | ✅ | ✅ |

Anonymous → **401**; wrong role → **403**; rate-limit excess → **429** — all as the standard JSON error body. Rate limits: **5 logins/min/IP** and **2 GitHub syncs/min/user** (in-memory sliding window; single-instance by design).

**Accounts are admin-created only** — no self-registration. A bootstrap admin is created/normalized at startup from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (idempotent; skipped when unset).

### Session handling (Next.js BFF proxy)

The browser **never sees the JWT**: the frontend calls same-origin `/api/*` routes, and the Next.js server proxies them to the backend (`app/api/[...path]/route.ts`), attaching the JWT from an **httpOnly, Secure (prod), SameSite=Strict cookie** (`act_session`). Login/logout/me have dedicated BFF routes (`app/api/auth/*`). The backend URL is a **server-side env var** (`BACKEND_URL`) — not exposed to the browser. GitHub PATs flow per-request through the `X-GitHub-Token` header (still browser-localStorage; see limitations).

All error responses share a consistent JSON body (`timestamp`, `status`, `error`, `message`, and `fieldErrors` for validation failures). Duplicate username/email → **409**; invalid input → **400** with per-field details.

List endpoints return a stable paginated envelope:

```json
{ "content": [...], "page": 0, "size": 20, "totalElements": 42, "totalPages": 3, "last": false }
```

## Database schema

The schema is managed by **Flyway** migrations (`src/main/resources/db/migration/`), applied at boot; Hibernate runs in `validate` mode (no auto-DDL). Entities carry audit timestamps (`createdAt`/`updatedAt`) populated automatically on write.

## Getting Started

### Prerequisites

- Java 17+ and Maven (backend)
- Node.js 22+ and pnpm 11.22 (frontend)
- PostgreSQL 15+ running locally — or just Docker (`docker compose up`)

### Environment variables

**Backend** (set in your shell — Spring does not read `.env` files; see `.env.example`):

```powershell
$env:SPRING_DATASOURCE_PASSWORD="your_db_password"
$env:JWT_SECRET="a-random-string-of-at-least-32-chars"   # required
$env:ADMIN_EMAIL="admin@example.com"                    # bootstrap admin (recommended)
$env:ADMIN_PASSWORD="a-strong-password"                 # bootstrap admin (recommended)
$env:GITHUB_API_TOKEN="your_github_token"               # optional — sync needs it or a per-request token
# optional overrides:
# $env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/agile_capacity"
# $env:SPRING_DATASOURCE_USERNAME="postgres"
# $env:APP_CORS_ALLOWED_ORIGINS="http://localhost:3000"
```

**Frontend** (`.env.local` in `frontend/`, or shell — server-side only):

```
BACKEND_URL=http://localhost:8080
```

### Run the backend

```bash
mvn spring-boot:run        # http://localhost:8080
```

Flyway applies migrations (`V1`–`V6`) at boot; Hibernate runs `ddl-auto=validate` (no auto-DDL). V5 adds GitHub sync metadata (issue URLs, close dates, `synced_repository`, settings extensions); V6 adds daily `sprint_snapshot` for burndown history.

### Run the frontend

```bash
cd frontend
pnpm install
pnpm dev                   # http://localhost:3000
```

Other scripts: `pnpm lint`, `pnpm test` (vitest), `pnpm build`.

## Testing

**Backend** — JUnit 5 + Spring Boot Test against an in-memory H2 database (no PostgreSQL needed):

```bash
mvn test
```

- Unit tests: `TrackerService` (validation + CRUD + team settings), `CapacityService` (workload v2 math), `SprintLengthCalculator` (weekday counts, fallbacks, active-range edges), `GitHubService` (token resolution, closed-issue handling, staleness, auto-sync), `DashboardService` (stats aggregation), `TaskIdGenerator` (id format), `JwtService` (issue/parse/reject), `AuthService` (login, 401s, profile/password), `RateLimitFilter` (sliding-window math)
- Integration test (`ApiIntegrationTest`): real login flow, anonymous 401s, role matrix 401/403, full CRUD over HTTP, workload v2 envelope (live dates around today), settings auth matrix, dashboard stats, profile/password flows, request-ID header, synced-repo management, cascade deletes, validation/409 error paths

**Frontend** — Vitest + Testing Library (jsdom):

```bash
cd frontend
pnpm test
```

- API client (same-origin paths, request shapes, X-GitHub-Token, workload envelope, dashboard-stats envelope, profile/password/synced-repo calls, error propagation, pagination)
- Team settings API (GET/PUT `/api/settings` full shape incl. sync frequency + alert toggles, validation-error surfacing)
- Auth provider (BFF login/logout/session-restore/rejection, `refreshUser` after profile changes)
- BFF route handlers (cookie set/clear, JWT forwarding, upstream error passthrough, profile/password proxying)
- No-mock-data regression (dashboard widgets must fetch real data — no hardcoded arrays)

**CI** — GitHub Actions runs backend `mvn verify` and frontend lint + test + build on every push/PR to `main` (`.github/workflows/ci.yml`). No secrets required: backend tests use H2, frontend tests mock `fetch`.

### Sign in

Use the bootstrap admin account you configured (`ADMIN_EMAIL`/`ADMIN_PASSWORD`); further accounts are created on the Team Management page (admin only).

## Configuration & capacity math

All capacity math is computed **server-side** (single source of truth); the frontend renders it.

- **Sprint length** = count of weekdays (Mon–Fri) between the sprint's `startDate`/`endDate`, inclusive. The "active" sprint is the one whose range contains today; when no dated sprint is active, the workload falls back to 10 weekdays and reports `sprintActive: false`.
- **Working hours per day** — shared team setting (`GET`/`PUT /api/settings`, admin-managed; default 8).
- **Capacity %** — `usedHours / (sprintDays × workingHoursPerDay) × 100`, delivered per member as `usedPercent`/`allocatedPercent`.
- **Allocated hours** — `dailyCapacityHours × sprintDays` per member.
- **GitHub token** — entered on the GitHub page and kept in the browser's `localStorage`; sent per request via the `X-GitHub-Token` header (through the BFF). The backend never stores it. Auto-sync (when enabled in settings) uses the server's own `GITHUB_API_TOKEN`.
- **GitHub sync** — imports all issues (PRs skipped): new ones as `open` 0h tasks; existing ones refresh title/status/URL only (estimates, assignee, sprint untouched); closed issues become `done` with `githubClosedAt` set, and are flagged *stale* in dashboard stats when closed >30 days. Tasks are never deleted on sync.
- **Schedulers** — daily 23:50 UTC burndown snapshot per active sprint (remaining = non-done estimates); GitHub re-sync hourly or daily 06:00 UTC per the `syncFrequency` team setting (manual = off), each remembered repo in isolation, failures swallowed and recorded per-repo.

## Known limitations

- **Imported GitHub issues carry no hour estimates** — they import with 0h; set estimates per task (preserved on re-sync).
- **GitHub PAT lives in browser localStorage** — readable by scripts on the page (XSS surface). The session JWT is httpOnly-cookie-protected, but the GitHub PAT trade-off remains.
- **No refresh tokens** — 12h JWT expiry; users re-login daily.
- **Rate limits are per-instance** — in-memory sliding windows; fine for the single App Runner instance, would need a shared store if scaled horizontally.

## Project structure

```
├── pom.xml                        # Spring Boot (backend at repo root)
├── src/main/java/com/agile/capacity/
│   ├── Main.java                  # entry point
│   ├── config/WebConfig.java       # CORS
│   ├── controller/               # User, Sprint, Task, Capacity, GitHub, Settings, Auth controllers
│   ├── dto/Dtos.java              # request/response records
│   ├── entity/                   # User, Sprint, Task, TeamSettings (JPA)
│   ├── repository/                # Spring Data JPA
│   ├── service/                   # TrackerService (CRUD + settings), CapacityService, GitHubService
│   └── util/                       # TaskIdGenerator, SprintLengthCalculator
├── src/main/resources/application.properties
├── src/test/                        # JUnit + Spring Boot integration tests (H2)
├── .github/workflows/ci.yml          # CI: backend verify + frontend lint/test/build
├── frontend/
│   ├── app/                       # Next.js App Router (login + dashboard pages)
│   ├── components/                # shadcn/ui + dashboard components (charts)
│   ├── tests/                     # Vitest + Testing Library tests
│   └── lib/api.ts                 # typed API client + settings helpers
└── .env.example
```

## Deployment

### Local full-stack (Docker parity)

```bash
docker compose up --build     # postgres + backend (8080) + frontend (3000)
```

The compose stack runs the **same images** the AWS deployment uses (repo-root `Dockerfile` for the Spring backend — multi-stage, layered jar, non-root; `frontend/Dockerfile` for the standalone Next.js server). Bootstrap admin in compose: `admin@local.test` / `compose-admin-pass-123` (compose-only). The Postgres volume is internal (not published to the host).

### AWS (App Runner + Amplify + RDS)

Production target: **App Runner** (backend, ECR-based) + **Amplify Hosting** (frontend, repo-connected) + **RDS PostgreSQL** (private subnet). CI/CD is GitHub Actions with **OIDC** — no static AWS keys. Full runbook with console steps, CDK equivalents, secrets layout, rollback, and cost baseline: **`docs/deployment-aws.md`** (kept in the internal docs set; the public summary is this section).

Deploy pipeline (`.github/workflows/deploy.yml`): builds the backend image → pushes to ECR `agile-tracker-backend` → triggers `apprunner update-service` → waits for healthy. It **self-skips until three repo variables exist** (`AWS_REGION`, `AWS_ACCOUNT_ID`, `APPRUNNER_SERVICE_ARN`) — adding them is what arms deploys. The frontend auto-deploys via Amplify on push to `main` with `BACKEND_URL` pointing at the App Runner URL.

Historical demo: https://scad-agile-capacitytracker.vercel.app/

## License

This project is licensed under the MIT License.
