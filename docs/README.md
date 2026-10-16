<p align="center">
  <img src="assets/harbor_light_notext.svg" alt="Harbor Logo" width="100" />
</p>

# Harbor Documentation Portal

Welcome to the comprehensive technical documentation for **Harbor**, a microservices-based deployment management and visibility platform.

Harbor provides development teams with a centralized interface to manage applications, deployment environments, per-environment secrets, CI/CD trigger dispatches, live deployment logs, real-time metrics, notifications, and cross-service audit reports. Source control and CI/CD execution are driven through GitHub and GitHub Actions, while Harbor manages, orchestrates, observes, and reports on the entire deployment lifecycle.

---

## Documentation Navigation

```text
docs/
├── README.md                              <-- Master documentation entry point (You are here)
├── azure-deployment-guide.md              <-- Azure production deployment & infrastructure reference
├── system_status.md                       <-- Operations & Container App scaling runbook
│
├── architecture/                          <-- Architectural blueprints & runbooks
│   ├── architecture.md                    <-- Comprehensive microservices architecture description
│   ├── system-context.md                  <-- C4 System Context & Container diagrams
│   ├── deployment-flow.md                 <-- End-to-end deployment lifecycle & state machine
│   ├── event-flow.md                      <-- Kafka / Event Hubs asynchronous streaming architecture
│   └── observability-runbook.md           <-- Telemetry, metrics scraping, alerts & health probes
│
├── api/                                   <-- API specifications & contracts
│   └── README.md                          <-- Complete REST API & SignalR endpoint catalog
│
├── database/                              <-- Persistence & storage blueprints
│   └── database-design.md                 <-- PostgreSQL schema, migrations, ERD & ADO.NET patterns
│
├── deployment/                            <-- Deployment guides & external integrations
│   ├── deployment-guide.md                <-- Local dev, Docker Compose, and environment setup
│   └── github-actions-integration.md      <-- GitHub App & workflow dispatch integration reference
│
├── reference/                             <-- Product backlog & requirement context
│   └── project_context.md                 <-- Complete A-Z project backlog & domain specifications
│
└── testing/                               <-- Quality assurance & test engineering portal
    ├── README.md                          <-- Testing strategy & QA portal index
    ├── 01-test-strategy.md                <-- Testing methodology & quality principles
    ├── 02-test-plan.md                    <-- Project test plan & execution criteria
    ├── 03-test-environment.md             <-- Test environment matrix (Local, CI, Cloud)
    ├── coverage/
    │   ├── code-coverage.md               <-- Measured code coverage report (94.6% line coverage)
    │   ├── requirements-coverage.md       <-- Requirements Traceability Matrix (RTM)
    │   └── test-case-coverage.md          <-- Test case execution coverage
    ├── defects/
    │   └── defect-log.md                  <-- Consolidated defect lifecycle tracking
    ├── e2e/
    │   ├── selenium-strategy.md           <-- Selenium test automation architecture
    │   └── selenium-results.md            <-- E2E automated test execution results
    ├── execution/
    │   ├── test-results.md                <-- Test execution summary
    │   ├── regression-test-results.md     <-- Regression test run analysis
    │   └── test-execution-log.md          <-- Execution timeline log
    ├── performance/
    │   ├── jmeter-test-plan.md            <-- JMeter load & spike testing plan
    │   ├── jmeter-results.md              <-- JMeter execution results & latencies
    │   └── deployment-performance-results.md <-- Deployment engine performance benchmarks
    ├── reports/
    │   ├── sprint-01-qa-report.md         <-- Sprint 1 QA report
    │   ├── sprint-02-qa-report.md         <-- Sprint 2 QA report
    │   ├── sprint-03-qa-report.md         <-- Sprint 3 QA report
    │   ├── sprint-04-qa-report.md         <-- Sprint 4 QA report
    │   └── final-qa-report.md             <-- Final project QA summary & release approval
    ├── security/
    │   └── security-test-report.md        <-- Security validation & vulnerability audit
    └── test-cases/                        <-- Formal test case specifications
        ├── functional-test-cases.md
        ├── unit-test-cases.md
        ├── integration-test-cases.md
        ├── api-test-cases.md
        ├── security-test-cases.md
        ├── e2e-test-cases.md
        └── performance-test-cases.md
```

---

## Architectural Highlights

| Component | Responsibility | Tech Stack |
|:---|:---|:---|
| **Harbor Web Portal** | Developer application for managing projects, environments, services, and live deployments. | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7 |
| **Harbor Admin Portal** | Operational portal for platform administrators (user management, global custom domains, audit logs, system telemetry). | React 19, TypeScript, Vite 8, Tailwind CSS 4, Lucide Icons |
| **Harbor.ApiGateway** | Single entry point reverse proxy; routes traffic by path prefix, manages CORS, handles rate limiting, and forwards client headers. | ASP.NET Core (.NET 10), YARP Reverse Proxy |
| **Harbor.Authentication** | Identity and Access Management; handles user registration, JWT issuance/revocation, BCrypt password hashing, and GitHub OAuth / GitHub App integration. | ASP.NET Core, ADO.NET (Npgsql), Redis token blacklist |
| **Harbor.Project** | Project and microservice definitions, GitHub repository/branch/commit proxy, custom service domain verification, and third-party integrations. | ASP.NET Core, ADO.NET (Npgsql), DNS TXT/CNAME resolution |
| **Harbor.Environment** | Per-project deployment environments (Development, Staging, Production), environment configurations, and AES-256-GCM secret encryption at rest. | ASP.NET Core, ADO.NET (Npgsql), AES-GCM cryptography |
| **Harbor.Deployment** | Deployment state machine, GitHub Actions workflow dispatching, webhook callback ingestion, cloud URL extraction, Kafka event production & consumption, notifications. | ASP.NET Core, Confluent.Kafka, GitHub App JWT / Installation Token |
| **Harbor.Reporting** | Cross-service audit logs, parameterized deployment reports, multi-cloud log adapters (AWS, Azure, GCP, Docker, K8s, Render, Vercel), SignalR live log streaming. | ASP.NET Core, SignalR Hub, ADO.NET, ProviderAdapterFactory |
| **Harbor.Caching** | Shared distributed caching layer with sliding/absolute TTL policies and token blacklist validation. | StackExchange.Redis, .NET 10 |
| **Harbor.Common** | Shared cross-cutting concerns: Correlation ID middleware, Global Exception Handling (RFC 7807), Sensitive Data Scrubber, Prometheus metrics guard, Health Checks. | .NET 10 |
| **Harbor.GitHub** | Shared library for GitHub App REST API integration, RS256 JWT creation, installation token generation, and OAuth negotiation. | .NET 10, Octokit / HttpClient |

---

## Key Documentation Quick Links

### 1. Architecture & Design
- [High-Level Architecture Blueprint](architecture/architecture.md): Service boundaries, communication topologies, caching, and resiliency patterns.
- [System Context & Container Blueprints](architecture/system-context.md): C4 system and container diagrams detailing actors, trust zones, and boundary interfaces.
- [Deployment Lifecycle & Automation](architecture/deployment-flow.md): Sequence diagrams, state machine transitions, GitHub Actions dispatch inputs, and webhook processing.
- [Event-Driven Streaming Architecture](architecture/event-flow.md): Apache Kafka and Azure Event Hubs topic models, event contracts, producers, and consumers.
- [Observability & Monitoring Runbook](architecture/observability-runbook.md): Health check probes (`/health/live`, `/health/ready`), Prometheus metric scraping (`/metrics`), and Grafana dashboard setup.

### 2. API Surface
- [API Reference Guide](api/README.md): Exhaustive documentation of all REST endpoints, SignalR hubs, authentication headers, request/response models, and error envelopes.

### 3. Database Architecture
- [Database Design & Migrations](database/database-design.md): PostgreSQL schema models, versioned migration runner (`MigrationRunner`), ADO.NET data access principles, and AES-256-GCM secret protection.

### 4. Setup, Deployment & Operations
- [Local & Containerized Deployment Guide](deployment/deployment-guide.md): Step-by-step instructions for running Harbor via Docker Compose or bare-metal local tooling.
- [GitHub Actions Integration Guide](deployment/github-actions-integration.md): Configuring target repositories, GitHub App installation tokens, and workflow dispatch inputs.
- [Azure Deployment Guide](azure-deployment-guide.md): Production Azure Container Apps deployment, networking, and secrets setup.
- [Operations & Scaling Runbook](system_status.md): Azure CLI commands to scale Harbor services to zero when idle and restart them sequentially.

### 5. Quality Assurance & Verification
- [Testing Portal Index](testing/README.md): Central index for all test strategies, plans, execution logs, and defect reports.
- [Code Coverage Report](testing/coverage/code-coverage.md): Measured test coverage report documenting 94.6% overall line coverage across backend microservices.
- [Sprint QA Reports](testing/reports/): Sprint-by-sprint QA reports (Sprints 1 through 4) and the [Final QA Report](testing/reports/final-qa-report.md).
