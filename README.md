# Harbor

Harbor is a microservices-based deployment and environment management platform. It lets a team register projects, define environments (Development / Staging / Production), store per-environment configuration and secrets, track deployments, and (in later sprints) receive event-driven notifications and reporting on deployment activity.

This README is the single entry point for the project's technical documentation: architecture, configuration, local setup, API surface, data model, testing, CI/CD, and the key implementation decisions behind the codebase. It is a **living document** — see [Documentation Maintenance](#documentation-maintenance) for the rule on keeping it that way.

> **Case study context:** Harbor is built as an academic microservices case study (SE3022) delivered across four sprints. Formal QA artifacts (test strategy, test plans, sprint QA reports) live in [`docs/testing/`](docs/testing/README.md).

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Repository Structure](#repository-structure)
4. [Getting Started](#getting-started)
5. [Configuration Reference](#configuration-reference)
6. [Services & Ports](#services--ports)
7. [API Reference](#api-reference)
8. [Data Model](#data-model)
9. [Frontend Applications](#frontend-applications)
10. [Security Notes](#security-notes)
11. [Testing Strategy](#testing-strategy)
12. [CI/CD Pipelines](#cicd-pipelines)
13. [Frontend–Backend Integration Verification](#frontendbackend-integration-verification)
14. [Architecture & Implementation Decisions](#architecture--implementation-decisions)
15. [Known Limitations & Roadmap](#known-limitations--roadmap)
16. [Documentation Maintenance](#documentation-maintenance)
17. [Documentation Index](#documentation-index)

---

## Architecture Overview

Harbor follows a **microservices architecture**: one ASP.NET Core Web API per business capability, fronted by a single API Gateway, with two independent React SPAs as clients.

```
                        ┌─────────────────┐        ┌──────────────────┐
                        │   harbor-web     │        │   harbor-admin    │
                        │  (React + Vite)  │        │  (React + Vite)   │
                        └────────┬─────────┘        └─────────┬─────────┘
                                 │                              │
                                 │        HTTPS / JSON          │
                                 ▼                              ▼
                        ┌───────────────────────────────────────────┐
                        │           Harbor.ApiGateway (YARP)         │
                        │   /api/auth, /api/protected                │
                        │   /api/projects, /api/projects/{id}/envs   │
                        │   /api/deployments, /api/reporting         │
                        └───────────────────┬─────────────────────────┘
                                            │  reverse-proxied, per route
             ┌───────────────┬─────────────┼───────────────┬──────────────┐
             ▼               ▼             ▼               ▼              ▼
     Harbor.Authentication  Harbor.Project  Harbor.Environment  Harbor.Deployment  Harbor.Reporting
      (users, JWT, roles)   (projects)      (envs + config)     (deployments)      (planned)
             │               │             │               │
             └───────────────┴─────────────┴───────────────┘
                                 │
                                 ▼
                          PostgreSQL (harbor_db)
                     one schema, per-service tables,
                     accessed via ADO.NET (Npgsql) — no ORM

     ┌─────────────────────────────┐        ┌───────────────────────────────┐
     │ Kafka (reserved, not wired) │        │ Prometheus / Grafana (reserved) │
     │ future deployment events    │        │ future metrics & dashboards     │
     └─────────────────────────────┘        └───────────────────────────────┘
```

**Design summary:**

- Every backend capability is its own deployable ASP.NET Core Web API project under `src/backend/`.
- `Harbor.ApiGateway` is the **only** public entry point the frontends talk to. It is a [YARP](https://microsoft.github.io/reverse-proxy/) reverse proxy that routes by path prefix to the internal services (see [`appsettings.json`](src/backend/Harbor.ApiGateway/appsettings.json)) and centralizes CORS.
- All services share **one PostgreSQL database** (`harbor_db`) but each service owns its own tables and never queries another service's tables directly — cross-service data needs go through HTTP, preserving service boundaries even though the database is physically shared.
- Data access is raw SQL via `Npgsql`/ADO.NET behind a Repository interface — there is intentionally no ORM (see [Implementation Decisions](#architecture--implementation-decisions)).
- `Harbor.Authentication` is the identity provider: it issues JWTs that every other service independently validates using a shared `JWT_SECRET`/`JWT_ISSUER`/`JWT_AUDIENCE` — no service-to-service call is needed to verify a token.
- Kafka and Prometheus/Grafana directories exist under `infrastructure/` as **reserved integration points** for future event-driven notifications and observability; they are not yet wired into any service (see [Known Limitations](#known-limitations--roadmap)).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript, Vite 8, React Router 7, Tailwind CSS 4, npm workspaces |
| Backend | ASP.NET Core Web API (.NET 8 runtime / .NET 10 SDK in CI), C# |
| API Gateway | YARP (Yet Another Reverse Proxy) |
| Database | PostgreSQL 15, accessed via ADO.NET / Npgsql (no ORM) |
| Auth | JWT (HMAC-SHA256), passwords hashed with BCrypt |
| Secrets at rest | AES-256-GCM (environment configuration secret values) |
| Email | SMTP (Brevo in production, Mailpit locally) |
| API Docs | Swagger / Swashbuckle (Bearer auth enabled) |
| Config | DotNetEnv (`.env`, git-ignored) |
| Testing | xUnit + Moq (unit), Testcontainers (integration), Selenium (E2E), JMeter (performance) |
| CI/CD | GitHub Actions, Docker, Azure Container Apps |
| Messaging (reserved) | Apache Kafka |
| Observability (reserved) | Prometheus, Grafana |

---

## Repository Structure

```
harbor/
├── src/
│   ├── backend/
│   │   ├── Harbor.ApiGateway        # YARP reverse proxy + CORS + /health
│   │   ├── Harbor.Authentication    # Users, JWT issuance, roles, password reset
│   │   ├── Harbor.Project           # Projects (create/list/update/archive)
│   │   ├── Harbor.Environment       # Environments + per-env configuration/secrets
│   │   ├── Harbor.Deployment        # Deployment records + logs
│   │   └── Harbor.Reporting         # Scaffolded, no endpoints implemented yet
│   ├── frontend/
│   │   ├── harbor-web               # End-user application
│   │   ├── harbor-admin             # Admin dashboard
│   │   └── package.json             # npm workspaces root (harbor-web, harbor-admin)
│   └── shared/                      # Cross-cutting frontend/backend shared assets
├── infrastructure/
│   ├── docker/                      # Standalone Dockerfiles per service (reference copies)
│   ├── docker-compose/              # Alternate compose files (dev variant)
│   ├── database/                    # schema/seed/migrations placeholders
│   ├── kafka/                       # reserved config/topics (not yet wired)
│   └── monitoring/                  # Prometheus config + Grafana provisioning (reserved)
├── tests/
│   ├── unit/                        # One xUnit project per backend service
│   ├── integration/                 # Testcontainers-backed API integration tests
│   ├── Harbor.E2ETests/             # Selenium, page-object model, full-stack flows
│   ├── performance/                 # JMeter test plans + results
│   └── security/                    # Security test artifacts
├── docs/                            # Architecture, database, deployment, API, QA docs
├── scripts/
│   ├── ci/                          # CI helper scripts (test data seeding)
│   ├── development/                 # Local dev helper scripts
│   ├── docker/                      # Docker helper scripts
│   └── run-load-tests.sh            # JMeter runner
├── .github/workflows/               # ci.yml (build/test) and cd.yml (deploy to Azure)
├── docker-compose.yml                # One-command local stack (Postgres, Mailpit, all services)
├── .env.example                     # Template for the required .env file
├── harbor_postman_collection.json    # Manual API verification collection
├── harbor_postman_environment_local.json
└── Harbor.sln
```

Inside each backend service, the internal layering is consistent:

```
Controllers/   # HTTP endpoints — thin, delegate to Services
Services/      # Business logic, unit-tested against interfaces
Repositories/  # ADO.NET data access behind an interface (Repository Pattern)
Models/        # Domain entities
DTOs/          # Request/response contracts (never leak entities like PasswordHash)
Data/          # DbConnectionFactory / connection setup
Scripts/       # Numbered, idempotent SQL migration scripts (0001_, 0002_, ...)
```

`harbor-web` and `harbor-admin` are npm **workspaces** under `src/frontend/` — install once from `src/frontend/`, not inside each app folder; they still each have their own `package.json` for app-specific dependencies.

---

## Getting Started

### Prerequisites

- .NET 8 SDK (or later)
- Node.js 20+ and npm
- Docker & Docker Compose (recommended path)
- PostgreSQL 15 (only if running services without Docker)

### Option A — Docker Compose (recommended)

This brings up Postgres, Mailpit (local SMTP inbox), all five active backend services, and both frontends in one command.

```bash
cp .env.example .env
# fill in POSTGRES_PASSWORD, JWT_SECRET, ENVIRONMENT_SECRETS_KEY at minimum
docker compose up --build
```

| Service | URL |
|---|---|
| harbor-web | http://localhost:8080 |
| harbor-admin | http://localhost:8081 |
| API Gateway | http://localhost:5000 |
| Authentication | http://localhost:5001 |
| Project | http://localhost:5002 |
| Environment | http://localhost:5003 |
| Deployment | http://localhost:5004 |
| Reporting | http://localhost:5005 |
| Mailpit inbox | http://localhost:8025 |

> Generate `ENVIRONMENT_SECRETS_KEY` with:
> `dotnet script -e "System.Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32))"`

### Option B — Run services manually (multi-terminal)

1. Create `.env` at the repository root (see [Configuration Reference](#configuration-reference)).
2. Create the database and run the SQL scripts under each service's `Scripts/` folder in numeric order (or use `docker compose up -d postgres` and let each service's own startup migration logic apply them, per service).
3. Install frontend dependencies once:
   ```bash
   cd src/frontend
   npm install
   ```
4. Start each piece in its own terminal:
   ```bash
   # Backend services
   cd src/backend/Harbor.ApiGateway      && dotnet run   # http://localhost:5053
   cd src/backend/Harbor.Authentication  && dotnet run   # http://localhost:5196
   cd src/backend/Harbor.Project         && dotnet run   # http://localhost:5079
   cd src/backend/Harbor.Environment     && dotnet run   # http://localhost:5292
   cd src/backend/Harbor.Deployment      && dotnet run   # http://localhost:5288

   # Frontends
   cd src/frontend/harbor-web   && npm run dev            # http://localhost:5173
   cd src/frontend/harbor-admin && npm run dev -- --port 5174
   ```
5. Point the frontend at the gateway by setting `VITE_API_BASE_URL` (see below) — **do not** hardcode ports in source; both frontends already read this from the environment.

Each service also exposes Swagger at `/swagger` and the Gateway exposes a health check at `/health`.

---

## Configuration Reference

All backend services read configuration from a single root-level `.env` file (via DotNetEnv), git-ignored. Template: [`.env.example`](.env.example).

| Variable | Used by | Purpose |
|---|---|---|
| `POSTGRES_SERVER`, `POSTGRES_PORT`, `POSTGRES_DATABASE`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | All services | PostgreSQL connection |
| `JWT_SECRET` | All services | Symmetric HMAC-SHA256 key used to **sign** (Authentication) and **validate** (every other service) tokens — must be identical everywhere |
| `JWT_ISSUER`, `JWT_AUDIENCE` | All services | Must match between the issuer and every validator |
| `JWT_EXPIRY_MINUTES` | Harbor.Authentication | Token lifetime |
| `KAFKA_BOOTSTRAP_SERVERS`, `KAFKA_DEPLOYMENT_TOPIC` | Harbor.Deployment (reserved) | Not yet consumed by application code — placeholder for future event publishing |
| `GITHUB_TOKEN`, `GITHUB_WEBHOOK_SECRET` | Harbor.Deployment (reserved) | Placeholder for future GitHub Actions/webhook integration |
| `API_GATEWAY_URL` | Deployment tooling / CD | Base URL the frontend build points at in a given environment |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL` | Harbor.Authentication | Password-reset emails (Mailpit locally, Brevo in production) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | First-run seeding / CI | Seed credentials for an initial Admin account |
| `ENVIRONMENT_SECRETS_KEY` | Harbor.Environment | Base64-encoded 32-byte AES-256-GCM key used to encrypt/decrypt secret configuration values |
| `ALLOWED_ORIGINS` | CI / Gateway CORS | Comma-separated list of allowed frontend origins |

Frontend-specific configuration is via Vite env variables (`.env` in each app or shell-exported):

| Variable | Used by | Purpose |
|---|---|---|
| `VITE_API_BASE_URL` | harbor-web, harbor-admin | Base URL of the API Gateway (defaults to `http://localhost:5000/api` if unset) |

> **Never commit a real `.env`.** CI generates its own throwaway `.env` at the start of every run (see [`ci.yml`](.github/workflows/ci.yml)) and production secrets are injected as GitHub Actions repository secrets/variables (see [`docs/azure-deployment-guide.md`](docs/azure-deployment-guide.md)).

---

## Services & Ports

| Service | Local dev port (`dotnet run`) | Docker Compose port | Routes owned |
|---|---|---|---|
| Harbor.ApiGateway | 5053 | 5000 | `/health` (own) + proxies everything below |
| Harbor.Authentication | 5196 | 5001 | `/api/auth/*`, `/api/protected/*` |
| Harbor.Project | 5079 | 5002 | `/api/projects/*` (except nested environments) |
| Harbor.Environment | 5292 | 5003 | `/api/projects/{projectId}/environments/*` |
| Harbor.Deployment | 5288 | 5004 | `/api/deployments/*` |
| Harbor.Reporting | 5243 | 5005 | `/api/reporting/*` (route reserved, no controller yet) |
| harbor-web | 5173 | 8080 | — |
| harbor-admin | 5174 | 8081 | — |
| PostgreSQL | 5432 | 5432 | — |
| Mailpit | 1025 (SMTP) / 8025 (UI) | same | — |

Route ordering matters in the Gateway: the `environmentRoute` (`Order: 1`) is matched before the more general `projectRoute` (`Order: 2`), otherwise nested environment calls would be swallowed by the Project service's catch-all.

---

## API Reference

Full, always-current API contracts are in each service's Swagger UI (`/swagger`) and in [`harbor_postman_collection.json`](harbor_postman_collection.json) (paired with [`harbor_postman_environment_local.json`](harbor_postman_environment_local.json)). This table is a summary; see [`docs/api/README.md`](docs/api/README.md) for narrative details.

**Harbor.Authentication** (`/api/auth`, `/api/protected`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register (Role: `Developer` or `Viewer` only — self-registration cannot create `Admin`) |
| POST | `/api/auth/login` | No | Log in, returns a JWT |
| POST | `/api/auth/forgot-password` | No | Request a password-reset email |
| POST | `/api/auth/reset-password` | No | Complete a password reset with a token |
| GET | `/api/protected/ping` | Yes (any role) | Sample authenticated endpoint |
| GET | `/api/protected/developer-area` | Yes (Admin, Developer) | Role-restricted sample |
| GET | `/api/protected/admin-only` | Yes (Admin) | Role-restricted sample |

**Harbor.Project** (`/api/projects`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/projects` | Yes | Create a project |
| GET | `/api/projects` | Yes | List projects (owner-scoped) |
| PUT | `/api/projects/{id}` | Yes | Update a project |
| POST | `/api/projects/{id}/archive` | Yes | Archive a project (soft delete) |

**Harbor.Environment** (`/api/projects/{projectId}/environments`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/projects/{projectId}/environments` | Yes | Create an environment (`Development`/`Staging`/`Production`) |
| GET | `/api/projects/{projectId}/environments` | Yes | List environments for a project |
| PUT | `/api/projects/{projectId}/environments/{environmentId}` | Yes | Update an environment |
| DELETE | `/api/projects/{projectId}/environments/{environmentId}` | Yes | Deactivate an environment (soft delete) |
| GET | `/api/projects/{projectId}/environments/{environmentId}/configuration` | Yes | Read configuration (secrets returned redacted) |
| PUT | `/api/projects/{projectId}/environments/{environmentId}/configuration` | Yes | Upsert configuration (plaintext or encrypted secret values) |

**Harbor.Deployment** (`/api/deployments`)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/deployments` | Yes | List deployments |
| GET | `/api/deployments/{id}` | Yes | Get a deployment (with logs) |
| POST | `/api/deployments` | Yes | Record a new deployment |

**Harbor.ApiGateway**

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Gateway liveness check |
| GET | `/health/db` | No | Database connectivity check |

**Testing protected endpoints in Swagger:** log in via `/api/auth/login`, copy the `token` value, click **Authorize**, enter `Bearer <token>`, then call the protected endpoint.

---

## Data Model

Each service owns its own tables in `harbor_db`; migrations are plain, numbered SQL scripts under each service's `Scripts/` folder (no EF Core migrations, consistent with the "no ORM" decision). See [`docs/database/database-design.md`](docs/database/database-design.md) for the full ERD once populated.

| Table | Owning service | Key columns |
|---|---|---|
| `Users` | Harbor.Authentication | `Id`, `Username`, `Email`, `PasswordHash`, `Role`, `PasswordResetToken(+Expiry)`, `CreatedAt` |
| `Projects` | Harbor.Project | `Id`, `Name`, `Description`, `RepositoryUrl`, `OwnerId`, `IsArchived`, `ArchivedAt`, `CreatedAt`/`UpdatedAt` |
| `Environments` | Harbor.Environment | `Id`, `ProjectId`, `Name`, `Type` (`Development`/`Staging`/`Production`, enforced by CHECK), `IsActive`, `DeactivatedAt`, `DeploymentUrl`, `Provider` |
| `EnvironmentConfigurations` | Harbor.Environment | `Id`, `EnvironmentId`, `Key`, `Value` (plaintext or AES-256-GCM ciphertext), `IsSecret`, unique on `(EnvironmentId, Key)` |
| `Deployments` | Harbor.Deployment | `Id`, `ProjectId`, `OwnerId`, `Environment`, `Version`, `CommitSha`, `Status`, `StartedAt`/`CompletedAt`, `FailureReason` |
| `DeploymentLogs` | Harbor.Deployment | `Id`, `DeploymentId` (FK, cascade delete), `Timestamp`, `Level`, `Message` |

Notable constraints:
- An active environment type is unique per project (`UQ_Environments_Active_Project_Type`), but a deactivated one can be recreated — enforced with a partial unique index rather than a plain unique constraint.
- Only one `Users` role can be `Admin`, and it can never be created through public registration — it must be promoted via SQL:
  ```sql
  UPDATE "Users" SET "Role" = 'Admin' WHERE "Username" = 'your_username';
  ```

---

## Frontend Applications

Two independent, TypeScript React 19 SPAs, built with Vite and styled with Tailwind CSS 4, sharing dependencies through an npm workspace defined in [`src/frontend/package.json`](src/frontend/package.json):

- **harbor-web** — the primary end-user application (projects, environments, deployments).
- **harbor-admin** — an administrative dashboard for privileged operations.

Both call the API Gateway exclusively, through a small service layer (`src/services/*.ts` in each app) that reads its base URL from `VITE_API_BASE_URL` at build/runtime, e.g.:

```ts
const deploymentApiBase = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api') + '/deployments';
```

This means changing which Gateway a frontend points at (local, CI, staging, production) is a single environment variable change — no source edits required. Each app also has its own `nginx.conf` and `Dockerfile` for serving the production build as a static site behind Nginx.

---

## Security Notes

- Passwords are hashed with BCrypt — never stored or logged in plain text.
- All secrets (DB password, JWT signing key, environment-secret key) load from `.env` / deployment secrets, never hard-coded.
- Self-registration cannot create an `Admin` account.
- Login returns the same generic error for a wrong password and a non-existent username, to avoid leaking which accounts exist.
- `401` = not authenticated (missing/invalid token). `403` = authenticated but insufficient role.
- Environment configuration values marked `IsSecret` are encrypted at rest with AES-256-GCM using `ENVIRONMENT_SECRETS_KEY`; the API returns them redacted on read.
- CORS is centralized at the Gateway (`AllowFrontendOrigins` policy) rather than duplicated per service, though each service also carries its own `Cors:AllowedOrigins` for the case it's hit directly (e.g. Swagger, tests).

---

## Testing Strategy

Harbor tests at five levels; see [`docs/testing/01-test-strategy.md`](docs/testing/01-test-strategy.md) and [`docs/testing/README.md`](docs/testing/README.md) for the full QA methodology and sprint-by-sprint reports.

| Level | Tooling | Location | Run with |
|---|---|---|---|
| Unit | xUnit + Moq | `tests/unit/Harbor.*.Tests` | `dotnet test tests/unit/Harbor.Authentication.Tests` (per project) |
| Integration | xUnit + Testcontainers (real Postgres in Docker) | `tests/integration/Harbor.*.IntegrationTests` | `dotnet test tests/integration/Harbor.Project.IntegrationTests` |
| End-to-End | Selenium, page-object model | `tests/Harbor.E2ETests` | `dotnet test tests/Harbor.E2ETests/Harbor.E2ETests.csproj` (needs the full stack running) |
| Performance/Load | JMeter | `tests/performance` | `./scripts/run-load-tests.sh` |
| Security | Manual + tooling, tracked in `docs/testing/security` | `tests/security` | See [`docs/testing/security/security-test-report.md`](docs/testing/security/security-test-report.md) |

Solution-wide:
```bash
dotnet test --filter "FullyQualifiedName!~Harbor.E2ETests"   # unit + integration
dotnet test tests/Harbor.E2ETests/Harbor.E2ETests.csproj      # E2E, run separately
```

E2E tests are run in a **separate `dotnet test` invocation** from unit/integration, deliberately: running them in the same solution-wide command let MSBuild fan work across parallel nodes, so Selenium/Chrome competed with Testcontainers-backed Postgres startup for CPU on CI runners — causing intermittent `WebDriverTimeoutException` failures unrelated to any actual bug.

---

## CI/CD Pipelines

### CI — [`ci.yml`](.github/workflows/ci.yml)

Runs on every push/PR to `main`, `master`, `develop`, and `feature/*`. This pipeline **is** Harbor's automated frontend–backend integration check, not just a build step:

1. Generates a throwaway `.env` for the run.
2. Starts PostgreSQL via `docker compose up -d postgres`.
3. Installs frontend dependencies and builds both React apps (`npm run build --workspaces`).
4. Restores and builds the whole .NET solution.
5. Boots **all five active backend services** in the background, with the Gateway's `ReverseProxy` cluster addresses overridden via environment variables to point at the actual dynamic ports the other services started on — then polls each service's `/swagger` or `/health` endpoint until it responds before continuing.
6. Boots the **harbor-web** dev server with `VITE_API_BASE_URL` pointed at the live Gateway, and warms up Vite's transpilation of the pages E2E tests will hit.
7. Seeds deployment test data by calling the real Authentication API and inserting via `psql` ([`scripts/ci/seed-deployment-data.sh`](scripts/ci/seed-deployment-data.sh)).
8. Runs unit + integration tests.
9. Runs the full Selenium E2E suite against the live frontend + live backend + live database, as a separate step (see [Testing Strategy](#testing-strategy) for why).

### CD — [`cd.yml`](.github/workflows/cd.yml)

Runs on push to `main` (or manually). Builds and pushes all backend service images to Azure Container Registry, then deploys the five backend APIs as *internal* Azure Container Apps and the Gateway + two frontends as *external* Container Apps, wired together via `ReverseProxy` addresses at deploy time. Full step-by-step Azure setup is documented in [`docs/azure-deployment-guide.md`](docs/azure-deployment-guide.md).

---

## Frontend–Backend Integration Verification

**This section formalizes RETRO-03.** Previously, the frontend and backend for a feature were integrated only once both were "done," at the end of a sprint — by which point mismatches (wrong route, unexpected response shape, missing CORS origin, stale port) were expensive to trace back to their root cause. Harbor now treats integration as a checkpoint that happens **as soon as an endpoint is functionally complete**, not after.

**Checklist — run this the moment a backend endpoint is implemented and unit-tested, before the corresponding frontend work is considered done:**

1. **Smoke-test the endpoint directly**, before wiring up any UI:
   - Via Swagger (`/swagger` on the owning service), or
   - Via the shared Postman collection ([`harbor_postman_collection.json`](harbor_postman_collection.json) + [`harbor_postman_environment_local.json`](harbor_postman_environment_local.json)), or
   - Via `curl`/the service's own `.http` file (each service ships one, e.g. [`Harbor.Deployment.http`](src/backend/Harbor.Deployment/Harbor.Deployment.http)).
2. **Route it through the Gateway, not just the service directly** — confirm the path is registered under `ReverseProxy:Routes` in [`Harbor.ApiGateway/appsettings.json`](src/backend/Harbor.ApiGateway/appsettings.json) and that route ordering doesn't cause it to be shadowed by a broader route (see [Services & Ports](#services--ports)).
3. **Wire the frontend service call against the live Gateway locally** (`VITE_API_BASE_URL` pointed at `http://localhost:5000/api` or the Gateway's dev port), not against a mock — confirm the response shape the UI expects actually matches what the DTO returns.
4. **Confirm CORS** — if the call is made from a browser tab and fails silently or with an opaque network error before any component-level bug is investigated, check `Cors:AllowedOrigins` on the Gateway and the owning service first.
5. **Add or extend the integration test** for the endpoint under `tests/integration/` so the check above is repeatable, not a one-time manual step.
6. **Only after 1–4 pass** should the corresponding E2E test/page object be written or extended in `tests/Harbor.E2ETests`.

This checklist is deliberately lightweight — steps 1–4 typically take a few minutes — and is meant to catch integration mismatches while the context is still fresh, rather than during E2E debugging at the end of a sprint. The CI pipeline (see [above](#cicd-pipelines)) enforces the same principle continuously: every push boots the real frontend against the real, fully-routed backend and runs E2E tests against that live stack, so a regression is caught within one CI run rather than at a sprint boundary.

---

## Architecture & Implementation Decisions

Key decisions made so far, with rationale, so future contributors don't have to reverse-engineer "why":

| Decision | Rationale |
|---|---|
| **Microservices, one ASP.NET project per capability** | Matches the case-study requirement to demonstrate independent services; each service can be built, tested, and deployed on its own pipeline job. |
| **Single shared PostgreSQL database, per-service tables** | Keeps local/dev setup and Azure cost low (one Flexible Server) while still preserving logical service boundaries — no service reads another's tables directly. |
| **ADO.NET / raw SQL instead of an ORM** | Explicit control over generated SQL and query performance; numbered SQL scripts double as a lightweight, auditable migration history without an EF Core migration pipeline to maintain. |
| **Repository Pattern + interfaces everywhere (`IUserRepository`, `IJwtService`, etc.)** | Services depend only on interfaces, which is why business logic (`AuthService`, etc.) is fully unit-testable with Moq, without a real database or JWT library. |
| **YARP API Gateway instead of each frontend calling services directly** | Single CORS policy, single public hostname per environment, and the internal services can be deployed as *internal-only* Container Apps in Azure — reducing attack surface. |
| **Stateless JWT validation shared by secret, not a central auth call per request** | Every service validates tokens locally with the shared `JWT_SECRET`/`Issuer`/`Audience`, avoiding a network round-trip to Authentication on every authorized request. |
| **DTOs never expose entities directly** | Prevents fields like `PasswordHash` or raw secret values from ever serializing into an API response. |
| **AES-256-GCM for environment secret values, not plaintext** | Environment configuration commonly holds credentials/API keys; storing them encrypted limits blast radius of a database-only compromise. |
| **Kafka and Prometheus/Grafana scaffolded but not wired** | Directory structure and config files are reserved ahead of the sprint that implements event-driven deployment notifications and metrics dashboards, so the eventual integration doesn't require restructuring the repo. |
| **E2E tests run as a separate `dotnet test` invocation from unit/integration in CI** | Avoids CPU contention between parallel MSBuild test nodes and Selenium/Testcontainers, which was the actual cause of intermittent E2E flakiness (not application bugs). |
| **Frontend reads API base URL from `VITE_API_BASE_URL`, not a hardcoded file** | Removes the earlier need to manually edit a `services/api.js` file per developer/environment when a backend port changed — one env var per environment instead. |

For architectural diagrams beyond this README (C4 context, deployment lifecycle, event flow once Kafka is wired), see [`docs/architecture/`](docs/architecture/).

---

## Known Limitations & Roadmap

- `Harbor.Reporting` is scaffolded (Program.cs, project file, Dockerfile) but has **no controllers or endpoints implemented yet** — the Gateway route exists and will 404 until it does.
- Kafka (`infrastructure/kafka/`) and the `Harbor.Deployment/Kafka` and `Harbor.Deployment/GitHub` folders are placeholders — no event publishing or GitHub webhook handling is implemented yet.
- Prometheus/Grafana (`infrastructure/monitoring/`) configuration exists but no service currently exposes metrics for it to scrape.
- `infrastructure/database/{schema,seed,migrations}` are placeholders; the authoritative migrations are the numbered SQL scripts inside each service's own `Scripts/` folder.
- `docs/architecture/*.md` and `docs/database/database-design.md` are still placeholders pending a dedicated documentation pass — this README is the interim authoritative source for architecture and configuration until those are filled in (tracked under RETRO-01, see below).
- No dedicated staging environment yet — CD deploys straight to the single Azure Container Apps environment described in [`docs/azure-deployment-guide.md`](docs/azure-deployment-guide.md).

---

## Documentation Maintenance

**This section formalizes RETRO-01.** Documentation drifted from the actual codebase in earlier sprints (e.g. the previous README described only Sprint 1's auth feature and an already-superseded manual port-editing workflow, and several `docs/` files were left as placeholders past the sprint that should have filled them). Going forward:

- **Any PR that changes an architecture, configuration, or data-model decision must update this README (and the relevant file under `docs/`) in the same PR** — not as a follow-up ticket.
- New backend services, new environment variables, new Gateway routes, or new database tables are added to the relevant table in this README (Services & Ports, Configuration Reference, API Reference, Data Model) as part of the change that introduces them.
- Placeholder docs under `docs/architecture/` and `docs/database/` are filled in during the sprint that implements the feature they describe (e.g. `event-flow.md` gets written when Kafka is actually wired up), not deferred indefinitely.
- The [Architecture & Implementation Decisions](#architecture--implementation-decisions) table is append-only within a sprint — decisions are recorded when made, with rationale, so the "why" isn't lost by the next sprint.

---

## Documentation Index

| Topic | Location |
|---|---|
| Architecture (C4 context, deployment flow, event flow) | [`docs/architecture/`](docs/architecture/) |
| Database design / ERD | [`docs/database/database-design.md`](docs/database/database-design.md) |
| API reference narrative | [`docs/api/README.md`](docs/api/README.md) |
| Deployment guide (general) | [`docs/deployment/deployment-guide.md`](docs/deployment/deployment-guide.md) |
| Azure Container Apps deployment (step-by-step) | [`docs/azure-deployment-guide.md`](docs/azure-deployment-guide.md) |
| QA strategy, test plans, sprint QA reports | [`docs/testing/README.md`](docs/testing/README.md) |
| Postman collection & environment | [`harbor_postman_collection.json`](harbor_postman_collection.json), [`harbor_postman_environment_local.json`](harbor_postman_environment_local.json) |
