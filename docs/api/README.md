# Harbor API Reference Guide

This document provides complete, exhaustive API documentation for all REST endpoints and SignalR WebSocket hubs exposed across the Harbor microservices architecture.

All client requests from frontends route through the **Harbor API Gateway** (`Harbor.ApiGateway`).

---

## 1. Global Conventions & Standards

### 1.1 Base URLs
- **Local Development (Gateway)**: `http://localhost:5000`
- **Production (Gateway)**: `https://api.harborapp.tech`

### 1.2 Authentication & Authorization Headers
Harbor supports three authentication modes depending on route context:

1. **User JWT Bearer Authentication**:
   ```http
   Authorization: Bearer <eyJhbGciOiJIUzI1Ni...JWT>
   ```
   Required for all protected application routes. The token is issued by `POST /api/auth/login` and contains user claims (`sub`, `email`, `role`, `jti`).

2. **Internal Service-to-Service Secret**:
   ```http
   X-Internal-Token: <SHARED_INTERNAL_SECRET>
   ```
   Required on `/internal/*` routes between microservices (e.g., `Harbor.Deployment` requesting installation tokens from `Harbor.Authentication`).

3. **Metrics Telemetry Scrape Token**:
   ```http
   Authorization: Bearer <METRICS_SCRAPE_TOKEN>
   ```
   Required in production to scrape `/metrics` endpoints.

### 1.3 Standard Response Formats

#### Successful Response Envelope
```json
{
  "success": true,
  "data": { ... },
  "message": null
}
```

#### RFC 7807 Standard Error Problem Details
```json
{
  "type": "https://tools.ietf.org/html/rfc7807",
  "title": "Bad Request",
  "status": 400,
  "detail": "The specified environment is deactivated and cannot accept deployments.",
  "instance": "/api/deployments",
  "correlationId": "0HN18392AB71:00000002"
}
```

---

## 2. Harbor.Authentication Endpoints (`/api/auth`)

### 2.1 User Authentication & Registration

#### `POST /api/auth/register`
Creates a new user account.
- **Access**: Public / Anonymous
- **Request Body**:
  ```json
  {
    "email": "developer@example.com",
    "password": "Password123!",
    "name": "Jane Doe"
  }
  ```
- **Responses**:
  - `201 Created`: User created. Returns user profile and initial JWT access token.
  - `400 Bad Request`: Validation failure (weak password, invalid email format).
  - `409 Conflict`: An account with this email already exists.

#### `POST /api/auth/login`
Authenticates a user using email and password.
- **Access**: Public / Anonymous
- **Request Body**:
  ```json
  {
    "email": "developer@example.com",
    "password": "Password123!"
  }
  ```
- **Responses**:
  - `200 OK`:
    ```json
    {
      "token": "eyJhbGciOiJIUzI1Ni...",
      "refreshToken": "7c8e9f0a-1b2c-3d4e...",
      "expiresAt": "2026-10-17T00:35:00Z",
      "user": {
        "id": 14,
        "publicId": "usr-491a2b",
        "email": "developer@example.com",
        "name": "Jane Doe",
        "role": "Developer"
      }
    }
    ```
  - `401 Unauthorized`: Invalid credentials.

#### `POST /api/auth/logout`
Revokes the current JWT access token by adding its `jti` to the Redis blacklist.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**:
  - `200 OK`: Token revoked; session terminated.

#### `POST /api/auth/forgot-password`
Initiates password recovery email.
- **Access**: Public / Anonymous
- **Request Body**: `{ "email": "developer@example.com" }`
- **Responses**: `200 OK`: Recovery email dispatched.

#### `POST /api/auth/reset-password`
Completes password reset using token delivered via email.
- **Access**: Public / Anonymous
- **Request Body**: `{ "token": "...", "newPassword": "NewPassword123!" }`
- **Responses**: `200 OK`: Password reset complete.

#### `PUT /api/auth/password`
Updates the password of the currently authenticated user.
- **Access**: Authenticated (`Bearer JWT`)
- **Request Body**: `{ "currentPassword": "...", "newPassword": "..." }`
- **Responses**: `200 OK`: Password updated.

---

### 2.2 Profile & Preferences

#### `GET /api/auth/me`
Retrieves the profile and role of the authenticated caller.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`: User profile object.

#### `PUT /api/auth/me`
Updates user name or contact information.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`: Updated profile.

#### `DELETE /api/auth/me`
Deletes the caller's account and revokes active tokens.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `204 No Content`.

#### `PUT /api/auth/preferences`
Updates user UI preferences (theme, notification settings).
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`: Preferences updated.

---

### 2.3 External OAuth & GitHub App

#### `GET /api/auth/external/{provider}`
Initiates OAuth flow (e.g., `provider = github`). Redirects user to provider authorization page.
- **Access**: Public / Anonymous

#### `GET /api/auth/external/{provider}/complete`
OAuth provider callback; exchanges authorization code for access token.
- **Access**: Public / Anonymous

#### `POST /api/auth/github/refresh-installation`
Updates or links the user's GitHub App installation ID.
- **Access**: Authenticated (`Bearer JWT`)
- **Request Body**: `{ "installationId": 12345678 }`
- **Responses**: `200 OK`.

---

### 2.4 Administrative User Management

#### `GET /api/auth/admin/users`
Lists all users on the platform.
- **Access**: Admin Role (`Roles = "Admin"`)
- **Responses**: `200 OK`: List of all user records.

#### `PUT /api/auth/admin/users/{userId}/role`
Updates a user's role (`Developer` or `Admin`).
- **Access**: Admin Role (`Roles = "Admin"`)
- **Request Body**: `{ "role": "Admin" }`
- **Responses**: `200 OK`.

#### `PUT /api/auth/admin/users/{userId}/status`
Activates or deactivates a user account.
- **Access**: Admin Role (`Roles = "Admin"`)
- **Request Body**: `{ "isActive": false }`
- **Responses**: `200 OK`.

---

### 2.5 Internal Authentication APIs
*Secured with header `X-Internal-Token: <SECRET>`*

#### `GET /api/auth/internal/{userId}/installation-token`
Resolves a temporary GitHub App Installation Access Token for the specified user.
- **Responses**: `200 OK`: `{ "token": "ghs_...", "expiresAt": "..." }`

---

## 3. Harbor.Project Endpoints (`/api/projects`)

### 3.1 Project Management

#### `POST /api/projects`
Creates a new project.
- **Access**: Authenticated (`Bearer JWT`)
- **Request Body**:
  ```json
  {
    "name": "E-Commerce Core",
    "description": "Primary microservices ecosystem"
  }
  ```
- **Responses**: `201 Created`: Project object with `publicId`.

#### `GET /api/projects`
Lists all projects owned by or accessible to the authenticated user.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`: Array of project summaries.

#### `GET /api/projects/{id}`
Retrieves a project by numeric ID or string `publicId`.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`: Project details.

#### `PUT /api/projects/{id}`
Updates project name or description.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`.

#### `POST /api/projects/{id}/archive`
Toggles the archived state of a project.
- **Access**: Authenticated (`Bearer JWT`)
- **Request Body**: `{ "isArchived": true }`
- **Responses**: `200 OK`.

---

### 3.2 Service Management within Projects

#### `POST /api/projects/{projectId}/services`
Registers a new microservice under a project.
- **Access**: Authenticated (`Bearer JWT`)
- **Request Body**:
  ```json
  {
    "name": "Order Service",
    "repositoryUrl": "https://github.com/acme/order-service",
    "gitBranch": "main",
    "workflowFile": "deploy.yml",
    "provider": "Azure",
    "isPrivate": false
  }
  ```
- **Responses**: `201 Created`: Service object with `publicId`.

#### `GET /api/projects/{projectId}/services`
Lists all services configured within a project.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`: Array of services.

#### `GET /api/projects/{projectId}/services/{id}`
Gets service details, repository URLs, and current deployment configuration.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`.

#### `PATCH /api/projects/{projectId}/services/{id}`
Updates service configuration (branch, workflow file, provider, deployment URL).
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`.

#### `DELETE /api/projects/{projectId}/services/{id}`
Deletes a service definition.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `204 No Content`.

---

### 3.3 GitHub Integration Proxies

#### `GET /api/projects/github/repositories`
Fetches repositories accessible to the user's connected GitHub installation.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`: Array of GitHub repositories with permissions.

#### `GET /api/projects/github/repositories/{owner}/{repo}/branches`
Fetches remote branches for a repository.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`: Array of branch names.

#### `GET /api/projects/github/repositories/{owner}/{repo}/branches/{branch}/commits`
Fetches recent commit SHAs and commit messages for a given branch.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`: Array of `{ "sha": "...", "message": "...", "author": "..." }`.

---

### 3.4 Custom Domains Management

#### `GET /api/projects/{projectId}/services/{serviceId}/domains`
Lists custom domains mapped to a service.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`: Array of domain records.

#### `POST /api/projects/{projectId}/services/{serviceId}/domains`
Registers a custom domain and generates verification DNS records (CNAME and TXT).
- **Access**: Authenticated (`Bearer JWT`)
- **Request Body**: `{ "domainName": "api.orders.example.com" }`
- **Responses**: `201 Created`: Domain object with required DNS verification targets.

#### `POST /api/projects/{projectId}/services/{serviceId}/domains/{domainId}/verify`
Queries public DNS to verify domain ownership and CNAME routing.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**:
  - `200 OK`: `{ "verified": true, "status": "Active" }`
  - `400 Bad Request`: `{ "verified": false, "message": "CNAME record not detected yet." }`

#### `PATCH /api/projects/{projectId}/services/{serviceId}/domains/{domainId}/primary`
Designates this domain as the primary routing domain for the service.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`.

#### `DELETE /api/projects/{projectId}/services/{serviceId}/domains/{domainId}`
Removes a custom domain.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `204 No Content`.

#### `GET /api/projects/admin/domains`
Lists all custom domains configured across all tenants.
- **Access**: Admin Role (`Roles = "Admin"`)
- **Responses**: `200 OK`.

---

## 4. Harbor.Environment Endpoints (`/api/projects/{projectId}/environments`)

### 4.1 Environments

#### `POST /api/projects/{projectId}/environments`
Creates a new deployment environment for a project.
- **Access**: Authenticated (`Bearer JWT`)
- **Request Body**:
  ```json
  {
    "name": "Staging",
    "type": "Staging"
  }
  ```
- **Responses**: `201 Created`: Environment object with `publicId`.

#### `GET /api/projects/{projectId}/environments`
Lists all active environments for a project.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`: Array of environments.

#### `PUT /api/projects/{projectId}/environments/{environmentId}`
Updates an environment's configuration.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`.

#### `DELETE /api/projects/{projectId}/environments/{environmentId}`
Deactivates an environment (soft delete).
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `204 No Content`.

---

### 4.2 Environment Configuration & Secrets

#### `GET /api/projects/{projectId}/environments/{environmentId}/configuration`
Retrieves environment variables and decrypted secrets for an environment.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`:
  ```json
  {
    "environmentId": 4,
    "variables": [
      { "key": "API_PORT", "value": "8080", "isSecret": false },
      { "key": "DB_PASSWORD", "value": "SuperSecretPass", "isSecret": true }
    ]
  }
  ```

#### `PUT /api/projects/{projectId}/environments/{environmentId}/configuration`
Persists configuration variables. Secrets (`isSecret = true`) are encrypted using AES-256-GCM before database insertion.
- **Access**: Authenticated (`Bearer JWT`)
- **Request Body**:
  ```json
  {
    "variables": [
      { "key": "API_PORT", "value": "8080", "isSecret": false },
      { "key": "DB_PASSWORD", "value": "SuperSecretPass", "isSecret": true }
    ]
  }
  ```
- **Responses**: `200 OK`.

---

## 5. Harbor.Deployment Endpoints (`/api/deployments` & `/api/notifications`)

### 5.1 Deployment Lifecycle

#### `POST /api/deployments`
Initiates a deployment and dispatches a GitHub Actions workflow.
- **Access**: Authenticated (`Bearer JWT`)
- **Request Body**:
  ```json
  {
    "serviceId": "srv-908123",
    "environmentId": 4,
    "version": "v1.4.2",
    "commitSha": "7f8b3c9a1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a",
    "branch": "main"
  }
  ```
- **Responses**:
  - `201 Created`:
    ```json
    {
      "id": 1042,
      "publicId": "dep-4a8f9c",
      "status": "Running",
      "serviceId": "srv-908123",
      "environment": "Staging",
      "version": "v1.4.2",
      "startedAt": "2026-10-16T22:15:00Z"
    }
    ```
  - `400 Bad Request`: Invalid environment or service parameters.

#### `GET /api/deployments`
Lists deployments filtered by query parameters.
- **Access**: Authenticated (`Bearer JWT`)
- **Query Parameters**:
  - `projectId` (string, optional)
  - `serviceId` (string, optional)
  - `environment` (string, optional)
  - `status` (string, optional)
  - `page` (int, default: 1)
  - `pageSize` (int, default: 20)
- **Responses**: `200 OK`: Paged list of deployments.

#### `GET /api/deployments/{id}`
Retrieves deployment record, sanitized build/deploy logs, duration, and final deployment URL.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`: Deployment details object.

#### `POST /api/deployments/{id}/redeploy`
Triggers a new deployment using the exact configuration, commit SHA, and environment of an existing deployment.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `201 Created`: New deployment object.

#### `POST /api/deployments/{id}/status`
Manually updates deployment status or cancels an in-progress deployment.
- **Access**: Authenticated (`Bearer JWT`)
- **Request Body**: `{ "status": "Cancelled" }`
- **Responses**: `200 OK`.

#### `GET /api/deployments/dashboard`
Returns high-level deployment statistics (total count, success rate %, active deployments, failure rate).
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`.

---

### 5.2 GitHub Webhook Ingress

#### `POST /api/deployments/webhooks/github`
Webhook receiver called by GitHub Actions workflows upon step completion or job termination.
- **Access**: Public with Webhook Secret verification
- **Request Body**:
  ```json
  {
    "deployment_id": 1042,
    "status": "succeeded",
    "workflow_run_id": 1827364512,
    "workflow_run_url": "https://github.com/acme/order-service/actions/runs/1827364512",
    "commit_message": "feat: order processing queue",
    "deployment_url": "https://orders-staging.harborapp.tech",
    "logs": "Building container...\nContainer deployed successfully."
  }
  ```
- **Responses**: `200 OK`.

---

### 5.3 In-App Notifications

#### `GET /api/notifications`
Retrieves in-app notifications for the authenticated user.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`: Array of notifications.

#### `PATCH /api/notifications/{id}/read`
Marks an individual notification as read.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`.

#### `PATCH /api/notifications/read-all`
Marks all unread notifications for the caller as read.
- **Access**: Authenticated (`Bearer JWT`)
- **Responses**: `200 OK`.

---

## 6. Harbor.Reporting Endpoints (`/api/reporting` & SignalR)

### 6.1 Audit Logs & Deployment Reports

#### `GET /api/reporting/deployments` (also `/api/reports/deployments`)
Generates a filtered deployment audit report using parameterized SQL queries.
- **Access**: Authenticated (`Bearer JWT`)
- **Query Parameters**:
  - `projectId` (string, optional)
  - `environment` (string, optional)
  - `status` (string, optional)
  - `startDate` (ISO 8601 DateTime, optional)
  - `endDate` (ISO 8601 DateTime, optional)
- **Responses**: `200 OK`: Array of deployment report entities (ID, project name, service name, environment, status, commit SHA, trigger actor, duration, deployment URL).

#### `GET /api/reporting/audit` (also `/api/reports/audit`)
Retrieves system-wide audit logs.
- **Access**: Admin Role (`Roles = "Admin"`)
- **Query Parameters**: `limit` (int, default: 100, max: 500)
- **Responses**: `200 OK`: Array of audit events.

---

### 6.2 Log Ingestion & Webhooks

#### `POST /api/reporting/logs/ingest/{serviceId}`
Ingests streaming log batches for a service.
- **Access**: Authenticated / Internal
- **Request Body**: Array of log lines with timestamps and levels.
- **Responses**: `200 OK`.

#### `POST /api/reporting/webhooks/{provider}/{serviceId}`
Receives native log streams and status callbacks from external cloud providers (Docker, AWS, Azure, GCP, Render, Vercel, DigitalOcean, Railway).
- **Access**: Webhook Token

---

### 6.3 SignalR Real-Time Log Streaming (`/hubs/logs`)

Harbor provides real-time full-duplex log streaming to web clients using ASP.NET Core SignalR.

- **Hub URL**: `/hubs/logs` (via Gateway)
- **Protocols Supported**: WebSockets, Server-Sent Events (SSE), Long Polling

#### Client Methods (Inbound to Server)
1. `SubscribeToService(string serviceId)`:
   - Registers caller into SignalR group `logs_{serviceId}`.
   - Immediately replays buffered historical logs from Redis (`logs:buffer:{serviceId}`).
   - Sends connection confirmation message.
2. `UnsubscribeFromService(string serviceId)`:
   - Removes caller from group and stops live pushes.

#### Server Events (Outbound to Client)
- `ReceiveLog(string serviceId, object logEntry)`:
  - Dispatched when new log lines are ingested or polled.
  - Payload structure:
    ```json
    {
      "timestamp": "23:14:02",
      "level": "INFO",
      "message": "Application listening on 0.0.0.0:8080"
    }
    ```

---

## 7. Health & Observability Endpoints

All Harbor microservices expose standard health and telemetry probes:

| Route | Method | Access | Description |
|:---|:---:|:---|:---|
| `/health` | `GET` | Public | Aggregated health check reporting component-level statuses. |
| `/health/live` | `GET` | Public | Liveness probe; returns `200 OK` `{ "status": "Healthy" }`. |
| `/health/ready` | `GET` | Public | Readiness probe; verifies active DB, Redis, and Kafka connections. |
| `/metrics` | `GET` | Protected | Prometheus-formatted metric stream. Requires `Authorization: Bearer <METRICS_SCRAPE_TOKEN>` in production. |