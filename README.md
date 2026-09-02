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
- CORS on the backend allows `http://localhost:3000`.
- The frontend API client is `frontend/lib/api.ts` — all dashboard pages use it; no page keeps mock data for its primary content.

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List team members |
| GET | `/api/users/{id}` | Get one member |
| POST | `/api/users` | Create member (`username`, `role`, `email?`, `githubUsername?`, `dailyCapacityHours?`) |
| PUT | `/api/users/{id}` | Update member |
| DELETE | `/api/users/{id}` | Delete member (cascades tasks) |
| GET | `/api/sprints` | List sprints (with computed task count + hours) |
| POST | `/api/sprints` | Create sprint (`name`, `startDate?`, `endDate?` ISO dates) |
| DELETE | `/api/sprints/{id}` | Delete sprint (cascades tasks) |
| GET | `/api/tasks` | List tasks (with assignee + sprint names) |
| POST | `/api/tasks` | Create task (`title`, `estimatedHours?`, `status?`, `assignedUserId?`, `sprintId?`) |
| PUT | `/api/tasks/{id}` | Update task |
| DELETE | `/api/tasks/{id}` | Delete task |
| GET | `/api/capacity/workload` | Per-member workload: `dailyCapacityHours`, `allocatedHours`, `usedHours` |
| POST | `/api/github/sync/{repo}` | Import a repo's open issues as tasks; optional `Authorization: Bearer <token>` header overrides the server's `GITHUB_API_TOKEN` |

## Getting Started

### Prerequisites

- Java 17+ and Maven (backend)
- Node.js 20+ and pnpm (frontend)
- PostgreSQL 15+ running locally

### Environment variables

**Backend** (set in your shell — Spring does not read `.env` files; see `.env.example`):

```powershell
$env:SPRING_DATASOURCE_PASSWORD="your_db_password"
$env:GITHUB_API_TOKEN="your_github_token"   # required to boot; used as GitHub-sync fallback
# optional overrides:
# $env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/agile_capacity"
# $env:SPRING_DATASOURCE_USERNAME="postgres"
```

**Frontend** (`.env.local` in `frontend/`, or shell):

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
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

- Unit tests: `TrackerService` (validation + CRUD), `CapacityService` (workload math), `GitHubService` (token resolution), `TaskIdGenerator` (id format)
- Integration test (`ApiIntegrationTest`): full CRUD flow over real HTTP — user/sprint/task lifecycle, workload math, cascade deletes, 400/404 error paths

**Frontend** — Vitest + Testing Library (jsdom):

```bash
cd frontend
pnpm test
```

- API client (request shapes, auth header, error propagation)
- Settings helpers (localStorage persistence/fallbacks) and capacity-percent derivation
- Mock auth flow (login, logout, session persistence, invalid credentials)

**CI** — GitHub Actions runs backend `mvn verify` and frontend lint + test + build on every push/PR to `main` (`.github/workflows/ci.yml`). No secrets required: backend tests use H2, frontend tests mock `fetch`.

### Sign in

Authentication is a client-side mock (any API endpoint is open without it). Demo accounts — password is `password` for all:

| Email | Role |
|-------|------|
| `admin@example.com` | admin |
| `lead@example.com` | team lead |
| `dev@example.com` | developer |

## Configuration & capacity math

- **Working hours per day** — set on the Settings page (persisted in the browser). Capacity % = `usedHours / (10 × hours/day)`.
- **Allocated hours** — the backend computes `dailyCapacityHours × 10` (10 = assumed sprint length; see limitations).
- **GitHub token** — entered on the GitHub page and kept in the browser's `localStorage`; sent per request as a `Bearer` header. The backend never stores it.

## Known limitations

- **Authentication is mock** — the login page checks hardcoded demo users; API endpoints require no credentials.
- **GitHub import is currently non-functional end-to-end** — the sync route cannot match `owner/name` repo paths (a slash cannot appear in a single path variable), so the frontend's sync call 404s. Additionally, imported issues carry no hour estimates, and re-syncing would duplicate tasks (the upsert key conflicts with the ID generator). Server-side logic is in place and unit-testable, but treat this feature as broken until fixed.
- **Sprint length is hardcoded to 10 days** — in the backend (`CapacityService`) and in three frontend components; sprint start/end dates are stored but ignored by the math.
- **Sprints cannot be edited** — only created and deleted.
- **Schema via `ddl-auto=update`** — no migration tooling (Flyway/Liquibase) yet.
- **CORS pinned to `http://localhost:3000`** — not configurable.

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
