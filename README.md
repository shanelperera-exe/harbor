# Harbor — Developer Guide

This README covers the Developer-side setup and usage for the parts of Harbor built in Sprint 1: application foundation, user registration, login with JWT, and role-based access control.

## Tech Stack

- **Frontend:** React (Vite)
- **Backend:** ASP.NET Core Web API (.NET 8, C#)
- **Database:** PostgreSQL, accessed via ADO.NET direct SQL (Npgsql) — no ORM
- **Auth:** JWT (HMAC-SHA256), passwords hashed with BCrypt
- **Docs:** Swagger / Swashbuckle (with Bearer token support)
- **Config:** DotNetEnv (`.env` file, never committed)
- **Testing:** xUnit + Moq
- **Architecture:** Microservices — one ASP.NET Web API project per capability

## Project Structure

```
harbor/
├── src/
│   ├── backend/
│   │   ├── Harbor.ApiGateway        # entry point, PostgreSQL health check
│   │   ├── Harbor.Authentication    # register, login, JWT, RBAC
│   │   ├── Harbor.Project
│   │   ├── Harbor.Environment
│   │   ├── Harbor.Deployment
│   │   └── Harbor.Reporting
│   ├── frontend/
│   │   ├── harbor-web
│   │   ├── harbor-admin
│   │   ├── node_modules
│   │   ├── package.json
│   │   └── package-lock.json
│   └── shared/
├── tests/
│   ├── Harbor.E2ETests
│   ├── integration/
│   ├── performance/
│   ├── security/
│   └── unit/
│       ├── Harbor.Authentication.Tests
│       ├── Harbor.Deployment.Tests
│       ├── Harbor.Environment.Tests
│       ├── Harbor.Project.Tests
│       └── Harbor.Reporting.Tests
├── .env
└── .env.example
```

`harbor-web` and `harbor-admin` share one `package.json`/`node_modules` at the `frontend/` level rather than each having their own — install dependencies once from `src/frontend/`, not inside each app folder.

Inside `Harbor.Authentication`:
```
Controllers/   # HTTP endpoints
Services/      # business logic (AuthService, JwtService)
Repositories/  # ADO.NET data access (UserRepository)
Models/        # User, Roles
DTOs/          # request/response contracts
Data/          # DbConnectionFactory
```

## Prerequisites

- .NET 8 SDK
- Node.js + npm
- PostgreSQL, with a `harbor_db` database created

## Setup

**1. Create `.env` at the repository root** (`harbor/.env`):
```
POSTGRES_SERVER=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=harbor_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_local_password

JWT_SECRET=a-long-random-secret-at-least-32-characters
JWT_ISSUER=HarborAuth
JWT_AUDIENCE=HarborClients
JWT_EXPIRY_MINUTES=60
```
This file is git-ignored — never commit real credentials.

**2. Create the database table:**
```sql
CREATE TABLE IF NOT EXISTS "Users" (
  "Id"                      SERIAL PRIMARY KEY,
  "Username"                VARCHAR(255) NOT NULL UNIQUE,
  "Email"                   VARCHAR(255) NOT NULL UNIQUE,
  "PasswordHash"            VARCHAR(255) NOT NULL,
  "Role"                    VARCHAR(50)  NOT NULL,
  "AvatarSvg"               TEXT         NULL,
  "PasswordResetToken"      VARCHAR(255) NULL,
  "PasswordResetTokenExpiry" TIMESTAMP   NULL,
  "CreatedAt"               TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
  );
```

## Running the Project

Install frontend dependencies once (shared by both frontend apps):
```bash
cd src/frontend
npm install
```

Then open terminals as needed:

```bash
# Terminal 1 — API Gateway
cd src/backend/Harbor.ApiGateway
dotnet run

# Terminal 2 — Authentication service
cd src/backend/Harbor.Authentication
dotnet run

# Terminal 3 — Main app (harbor-web)
cd src/frontend/harbor-web
npm run dev

# Terminal 4 — Admin dashboard (harbor-admin), only if working on admin-facing screens
cd src/frontend/harbor-admin
npm run dev
```

Each service prints its own port on startup — check the terminal output and update the `services/api.js` file in whichever frontend app you're running if a backend port changes.

- Gateway health check: `http://localhost:<gateway-port>/health`
- Authentication Swagger: `http://localhost:<auth-port>/swagger`

## Running Tests

```bash
cd tests/unit/Harbor.Authentication.Tests
dotnet test
```

18 unit tests covering registration validation, duplicate detection, password hashing, login, and JWT claims.

## API Endpoints (Harbor.Authentication)

| Method | Endpoint | Auth required | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register a new account (Role: `Developer` or `Viewer` only) |
| POST | `/api/auth/login` | No | Log in, returns a JWT |
| GET | `/api/protected/ping` | Yes (any role) | Sample protected endpoint |
| GET | `/api/protected/developer-area` | Yes (Admin, Developer) | Role-restricted sample endpoint |
| GET | `/api/protected/admin-only` | Yes (Admin) | Role-restricted sample endpoint |
| GET | `/api/health/db` | No | Database connectivity check |

**Testing protected endpoints in Swagger:** log in via `/api/auth/login`, copy the `token` value, click **Authorize** in Swagger, enter `Bearer <token>`, then call the protected endpoint.

## Security Notes

- Passwords are hashed with BCrypt — never stored or logged in plain text.
- Secrets (DB password, JWT signing key) load from `.env`, never hard-coded.
- Self-registration cannot create an `Admin` account — promote a user via SQL:
  ```sql
  UPDATE "Users" SET "Role" = 'Admin' WHERE "Username" = 'your_username';
  ```
- Login returns the same generic error for a wrong password and a non-existent username, to avoid leaking which accounts exist.
- `401` = not authenticated (no/invalid token). `403` = authenticated but wrong role.

## Design Notes

- `AuthService` depends only on `IUserRepository` and `IJwtService` (interfaces, not concrete classes) — this is why it's fully unit-testable without a real database or JWT library.
- `UserRepository` isolates all raw SQL behind an interface (Repository Pattern).
- DTOs (`RegisterRequest`, `LoginResponse`, etc.) keep internal fields like `PasswordHash` from ever being exposed over the API.

## Known Limitations

- No CI pipeline yet (US-02) — tests are run locally.
- No Selenium end-to-end tests yet.
- `Harbor.ApiGateway` and `Harbor.Authentication` use two different PostgreSQL connection patterns (`NpgsqlDataSource` vs `DbConnectionFactory`) — worth unifying in a later sprint.
- Services must be started manually in separate terminals; Docker Compose setup is planned for a later sprint (US-18).
