# Agile Team Capacity Tracker

A full-stack application for tracking agile team capacity: manage team members, sprints, and tasks, import GitHub issues, and visualize each member's workload against their allocated capacity.

**Status: work in progress** — the frontend and backend are fully integrated (live CRUD + workload data). Authentication is still mock and the GitHub import has a known defect (see [Known limitations](#known-limitations)).

## Features

- **Team management** — create, update, and remove team members with role (`admin` / `team_lead` / `developer`), GitHub username, and daily capacity in hours. Persisted in PostgreSQL.
- **Sprint management** — create sprints with start/end dates; task count and total estimated hours are computed live from real task data.
- **Task tracking** — full CRUD for tasks with hour estimates, status (`open` / `in_progress` / …), assignee, and sprint. Deleting a member or sprint cascades to their tasks.
- **Capacity dashboard** — per-member *used vs allocated* hours, average team capacity, overallocation count, and live charts driven by the backend workload API.
- **GitHub issue import** — pull a repository's open issues as tasks using a GitHub PAT, sent per-request from the UI (no token stored server-side). *(See limitations below.)*
- **Settings** — default working-hours-per-day (drives all capacity math) and GitHub token, persisted per browser.

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
    │  fetch() via NEXT_PUBLIC_API_BASE_URL (default http://localhost:8080)
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
| GET | `/api/capacity/workload` | Per-member workload: `dailyCapacityHours`, `allocatedHours`, `usedHours` |
| POST | `/api/github/sync/{owner}/{repo}` | Import a repo's open issues as tasks (idempotent: existing tasks updated in place); optional `X-GitHub-Token` header overrides the server's `GITHUB_API_TOKEN` |

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

Anonymous → **401**; wrong role → **403** — both as the standard JSON error body.

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
- Node.js 22+ and pnpm 11 (frontend)
- PostgreSQL 15+ running locally

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

Hibernate `ddl-auto=update` creates the schema on first boot.

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

- Unit tests: `TrackerService` (validation + CRUD), `CapacityService` (workload math), `GitHubService` (token resolution), `TaskIdGenerator` (id format), `JwtService` (issue/parse/reject), `AuthService` (login, 401s, session resolution)
- Integration test (`ApiIntegrationTest`): real login flow, anonymous 401s, role matrix 401/403, full CRUD over HTTP, workload math, cascade deletes, validation/409 error paths

**Frontend** — Vitest + Testing Library (jsdom):

```bash
cd frontend
pnpm test
```

- API client (same-origin paths, request shapes, X-GitHub-Token, error propagation, pagination)
- Settings helpers (localStorage persistence/fallbacks) and capacity-percent derivation
- Auth provider (BFF login/logout/session-restore/rejection through the real flow)
- BFF route handlers (cookie set/clear, JWT forwarding, upstream error passthrough)

**CI** — GitHub Actions runs backend `mvn verify` and frontend lint + test + build on every push/PR to `main` (`.github/workflows/ci.yml`). No secrets required: backend tests use H2, frontend tests mock `fetch`.

### Sign in

Use the bootstrap admin account you configured (`ADMIN_EMAIL`/`ADMIN_PASSWORD`); further accounts are created on the Team Management page (admin only).

## Configuration & capacity math

- **Working hours per day** — set on the Settings page (persisted in the browser). Capacity % = `usedHours / (10 × hours/day)`.
- **Allocated hours** — the backend computes `dailyCapacityHours × 10` (10 = assumed sprint length; see limitations).
- **GitHub token** — entered on the GitHub page and kept in the browser's `localStorage`; sent per request via the `X-GitHub-Token` header (through the BFF). The backend never stores it.

## Known limitations

- **Sprint length is hardcoded to 10 days** — in the backend (`CapacityService`) and in three frontend components; sprint start/end dates are stored but ignored by the math.
- **Imported GitHub issues carry no hour estimates** — they import with 0h; set estimates per task (preserved on re-sync).
- **GitHub PAT lives in browser localStorage** — readable by scripts on the page (XSS surface). The session JWT is httpOnly-cookie-protected, but the GitHub PAT trade-off remains.
- **No refresh tokens** — 12h JWT expiry; users re-login daily.

## Project structure

```
├── pom.xml                        # Spring Boot (backend at repo root)
├── src/main/java/com/agile/capacity/
│   ├── Main.java                  # entry point
│   ├── config/WebConfig.java       # CORS
│   ├── controller/                # User, Sprint, Task, Capacity, GitHub controllers
│   ├── dto/Dtos.java              # request/response records
│   ├── entity/                    # User, Sprint, Task (JPA)
│   ├── repository/                # Spring Data JPA
│   ├── service/                   # TrackerService (CRUD), CapacityService, GitHubService
│   └── util/TaskIdGenerator.java
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

Historical demo: https://scad-agile-capacitytracker.vercel.app/

## License

This project is licensed under the MIT License.
