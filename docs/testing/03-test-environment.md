# Harbor Test Environments Reference

This document details the environment topology, configurations, tooling, and test data management strategies utilized across the development and quality assurance lifecycle of the Harbor platform.

---

## 1. Local Development Environment

### Purpose
Used by developers for feature development, executing unit tests, and validating local integration checks before pushing code.

### Application Components
- **Frontend**: `harbor-web` (port `5173`) and `harbor-admin` (port `5174`) running on Node 20+ via Vite 8 and React 19.
- **API Gateway**: `Harbor.ApiGateway` running on port `5000` via ASP.NET Core (.NET 10) reverse-proxying internal services.
- **Backend Microservices**:
  - `Harbor.Authentication`: port `5001`
  - `Harbor.Project`: port `5002`
  - `Harbor.Environment`: port `5003`
  - `Harbor.Deployment`: port `5004`
  - `Harbor.Reporting`: port `5005`
- **Database**: PostgreSQL 15 running on `localhost:5432` in Docker (`postgres` service in `docker-compose.yml`).
- **Distributed Cache & Blacklist**: Redis 7 on `localhost:6379`.
- **Event Streaming**: Apache Kafka (KRaft mode) on `localhost:9092`.
- **Local Mail Trap**: Mailpit (SMTP on port `1025`, Web UI on port `8025`).

### Test Data
- Managed via `MigrationRunner` applying versioned SQL scripts in `Scripts/0001_*.sql`.
- Seed scripts under `scripts/ci/` (`seed-deployment-data.sh`, `seed-performance-data.sh`).

### Configuration
- Local `.env` file loaded via `DotNetEnv.Env.TraversePath().Load()`.

---

## 2. CI/CD Automated Test Environment (GitHub Actions)

### Purpose
Executes automated quality gates on every push and pull request, including unit tests, integration tests with real databases, and code coverage measurement.

### Application Components
- **Host**: GitHub-hosted Ubuntu Linux runners (`ubuntu-latest`).
- **Backend SDK**: .NET 10 SDK with .NET 8 runtime target.
- **Database Engine**: **Testcontainers for .NET** dynamically spins up ephemeral, isolated PostgreSQL 15 Docker containers during integration test runs (`Harbor.Deployment.IntegrationTests`, `Harbor.Project.IntegrationTests`, etc.).
- **Code Coverage Tooling**: `coverlet.collector` collecting Cobertura XML metrics; `ReportGenerator` aggregating multi-assembly reports.
- **Frontend Test Runner**: Vitest running component tests with `@testing-library/react` and JSDOM.

### Deployment Method
- Fully automated via GitHub Actions workflow definitions in `.github/workflows/`.

---

## 3. Staging / Performance Testing Environment

### Purpose
High-fidelity staging environment used for End-to-End (E2E) Selenium automation, JMeter performance and stress testing, and final QA verification.

### Application Components
- **Frontend**: Containerized SPAs served via Nginx.
- **Backend**: Containerized ASP.NET Core microservices connected through Docker bridge network.
- **Database**: PostgreSQL 15 container initialized with high-volume synthetic datasets for load benchmarking (seeded via `scripts/ci/seed-performance-data.sh`).
- **Cache**: Redis 7 container with memory limits matching production allocation.
- **Broker**: Apache Kafka broker configured with `deployment-events` topic.
- **Telemetry**: Prometheus scraping `/metrics` every 15s; Grafana visualizing system resource utilization and request latencies.

### Test Data
- Synthetic seed records: 50+ projects, 200+ services, 1,000+ deployment runs, and 10,000+ deployment log lines.

---

## 4. Production Cloud Environment (Azure Container Apps)

### Purpose
Live production environment hosting the Harbor deployment platform for software teams.

### Application Components
- **Resource Group**: `rg-harbor-centralindia` in Azure Central India region.
- **Host Platform**: Azure Container Apps (ACA) managed environment (`harbor-env-prod`).
- **Container Registry**: Azure Container Registry (`harboracr.azurecr.io`).
- **Ingress Endpoints**:
  - `harbor-web-ui`: `https://app.harborapp.tech`
  - `harbor-admin-ui`: `https://admin.harborapp.tech`
  - `harbor-api-gateway`: `https://api.harborapp.tech`
- **Internal Microservices (No External Ingress)**:
  - `harbor-auth-api`
  - `harbor-project-api`
  - `harbor-env-api`
  - `harbor-deploy-api`
  - `harbor-report-api`
- **Managed Database**: Azure Database for PostgreSQL Flexible Server (`harbor_db` with SSL required).
- **Managed Cache**: Azure Cache for Redis (Standard tier with SSL on port `6380`).
- **Managed Event Broker**: Azure Event Hubs (Kafka 1.0+ protocol on port `9093` with SASL authentication).
- **Email Delivery**: Brevo (Sendinblue) transactional SMTP relay.

### Security & Access Control
- Zero direct public exposure for internal microservices, databases, or Redis caches.
- Internal communication encrypted via TLS.
- Ingress protected via HTTPS (TLS 1.3), CORS origin restrictions, and edge rate limiting.
- Metrics endpoint guarded by `MetricsEndpointGuardMiddleware` requiring bearer scrape tokens.
