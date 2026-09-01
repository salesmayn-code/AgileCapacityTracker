# Agile Team Capacity Tracker

A full-stack application for tracking team capacity, managing sprints, and visualizing workload distribution.

**Status: work in progress.** The frontend and backend are currently independent applications (see below).

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Java 17, Spring Boot 3.2, Spring Data JPA, PostgreSQL |
| Frontend | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui |
| GitHub integration | org.kohsuke github-api |

## Current State

- **Backend** (repo root, Maven): REST API with two endpoints — `GET /api/capacity/workload` and `POST /api/github/sync/{repo}` (pulls repo issues as tasks). Entities: User, Sprint, Task. Schema is managed by Hibernate `ddl-auto=update`.
- **Frontend** (`frontend/`, pnpm): dashboard UI (overview, team, sprints, capacity, GitHub, settings pages) with mock data and mock authentication. It is **not yet wired to the backend** — no API calls exist yet.

## Getting Started

### Prerequisites

- Java 17+ and Maven (backend)
- Node.js 20+ and pnpm (frontend)
- PostgreSQL 15+ running locally

### Environment Variables (backend)

The backend reads secrets from the environment (see `.env.example`):

```powershell
$env:SPRING_DATASOURCE_PASSWORD="your_db_password"
$env:GITHUB_API_TOKEN="your_github_token"
# optional overrides:
# $env:SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/agile_capacity"
# $env:SPRING_DATASOURCE_USERNAME="postgres"
```

### Run the Backend

```bash
mvn spring-boot:run        # starts on http://localhost:8080
```

### Run the Frontend

```bash
cd frontend
pnpm install
pnpm dev                   # http://localhost:3000
```

Other scripts: `pnpm lint`, `pnpm build`.

## Deployment

Historical demo: https://scad-agile-capacitytracker.vercel.app/

## License

This project is licensed under the MIT License
