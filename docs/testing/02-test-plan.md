# Harbor Project Test Plan

## 1. Purpose
This document defines the comprehensive master test plan for the Harbor platform across all four development sprints. It details the testing scope, toolchain, environment prerequisites, schedule, and quality verification workflows required to ensure software delivery of the highest caliber.

---

## 2. Scope & Features Under Test
The testing scope encompasses all functional and non-functional requirements prioritized in the Harbor product backlog, covering both frontend Single-Page Applications (`harbor-web`, `harbor-admin`) and all backend microservices fronted by the YARP API Gateway:

### 2.1 Sprint 1: Application Foundation & Identity (US-01 – US-05)
- Microservices startup, Docker networking, API Gateway reverse proxy routing.
- User registration, BCrypt password hashing (work factor 11), login, and JWT issuance.
- Role-Based Access Control (RBAC) differentiating `Developer` and `Admin` permissions.
- User profile management, account deactivation, and UI preference persistence.

### 2.2 Sprint 2: Projects & Environment Tiers (US-06 – US-11)
- Project registration, updates, soft archiving, and ownership checks.
- Service definitions within projects (repository URLs, branch, workflow file, cloud provider).
- Deployment environment lifecycle (`Development`, `Staging`, `Production`) and deactivation.
- Environment variables and AES-256-GCM authenticated encryption for sensitive secrets at rest.
- Deployment configuration management.

### 2.3 Sprint 3: GitHub Integration & Deployment Engine (US-12 – US-17)
- GitHub App integration, RS256 JWT generation, and temporary installation access tokens.
- Interactive branch selection and recent commit SHA retrieval via GitHub API proxies.
- Triggering CI/CD deployments via GitHub Actions `workflow_dispatch` with 6 mandatory inputs.
- Custom domain routing, CNAME DNS checks, and automated domain verification.
- Asynchronous domain event streaming via Apache Kafka and Azure Event Hubs (`deployment-events`).

### 2.4 Sprint 4: Visibility, Notifications & Reporting (US-18 – US-22)
- Real-time deployment status reconciliation (`Pending` -> `Queued` -> `Running` -> `Succeeded`/`Failed`).
- GitHub webhook callback ingestion (`POST /api/deployments/webhooks/github`).
- Sensitive log sanitization (`DeploymentLogSanitizer`) and deployed URL extraction (`DeploymentUrlExtractor`).
- In-app notification creation, unread badge tracking, and read state persistence.
- Cross-service deployment reports and administrative audit logs using parameterized queries.
- Real-time full-duplex log streaming via SignalR WebSockets (`/hubs/logs`).

---

## 3. Test Levels & Strategies

| Test Level | Scope | Frameworks & Tooling | Target Criteria |
|:---|:---|:---|:---|
| **Unit Testing** | Individual classes, algorithms, regex sanitizers, crypto, controllers | xUnit, Moq, Vitest, `@testing-library/react` | 100% pass rate; ≥ 80% line coverage (Achieved: **94.6%**) |
| **Integration Testing** | Repository SQL queries, schema migrations, Kafka producers/consumers | Testcontainers for .NET (PostgreSQL 15), Confluent.Kafka | Real container-backed validation; zero mock data leakage |
| **API Contract Testing** | Gateway routing, RFC 7807 problem details, auth filters, CORS | REST client suites, Swagger OpenAPI specification | All status codes and payload contracts strictly verified |
| **E2E Automation** | Complete user journeys (login -> create project -> configure env -> deploy) | Selenium WebDriver, Page Object Model (POM) | Automated regression validation of core user paths |
| **Performance Testing** | Throughput, concurrent user resilience, latency percentiles | Apache JMeter (`.jmx` test plans and `.jtl` execution logs) | Auth < 50ms, Dashboard < 25ms, Reporting query < 65ms |
| **Security Validation** | Secret encryption, token blacklist, log scrubbers, RBAC | OWASP ZAP, BCrypt, AES-GCM tag verification, Redis blacklist | Zero sensitive token leakage; sub-millisecond token revocation |

---

## 4. Test Environments
For detailed environment architecture, see [03-test-environment.md](03-test-environment.md):
- **Local Development**: Docker Compose running PostgreSQL 15, Redis 7, Kafka KRaft, and Mailpit alongside bare-metal .NET 10 microservices and Vite frontends.
- **Automated CI (GitHub Actions)**: Headless test runner utilizing Testcontainers for ephemeral database instances.
- **Staging / Azure Production**: Azure Container Apps environment (`rg-harbor-centralindia`) connected to Azure Database for PostgreSQL Flexible Server, Azure Cache for Redis, and Azure Event Hubs.

---

## 5. Tooling Ecosystem
- **Backlog & Issue Tracking**: Jira
- **Code Repository & Documentation**: GitHub (`docs/` repository directory)
- **Interactive API Documentation**: Swagger UI / OpenAPI (`/swagger`)
- **Backend Test Instrumentation**: xUnit, Moq, Coverlet Data Collector, ReportGenerator
- **Frontend Test Instrumentation**: Vitest, JSDOM, React Testing Library
- **E2E Automation**: Selenium WebDriver in C# (`tests/Harbor.E2ETests`)
- **Performance & Load Testing**: Apache JMeter (`tests/performance/*.jmx`)

---

## 6. Roles & Responsibilities
- **Product Owner / Business Analyst**: User story definition, acceptance criteria, and demo sign-off.
- **Backend / Frontend Developers**: Feature implementation, unit testing, and immediate defect remediation.
- **QA Engineers**: Test case drafting, integration testing, E2E automation maintenance, performance benchmarking, and sprint QA reporting.
- **DevOps Engineers**: Container registry maintenance, CI/CD pipeline automation, Azure Container Apps scaling, and monitoring infrastructure.

---

## 7. Sprint Execution Schedule
- **Sprint 1**: Foundation testing, identity management, JWT verification, and initial test strategy.
- **Sprint 2**: Project and service catalog testing, environment tiers, and AES-256-GCM secret validation.
- **Sprint 3**: GitHub App integration, `workflow_dispatch` dispatching, custom domains, and Kafka event streaming.
- **Sprint 4**: Deployment status reconciliation, log sanitization, notification delivery, cross-service reporting, JMeter load testing, and final QA sign-off.
