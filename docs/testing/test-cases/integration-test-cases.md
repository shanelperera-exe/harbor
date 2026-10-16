# Harbor Integration Test Cases Specification

## 1. Overview
This document specifies integration test cases for the Harbor platform, verifying data persistence, repository query execution, migration consistency, Kafka event streaming, and inter-service HTTP contracts.

### Integration Testing Technologies:
- **Database Engine**: PostgreSQL 15 running in isolated Docker containers via **Testcontainers for .NET (`4.2.0`)**.
- **Data Access Layer**: ADO.NET / Npgsql with raw SQL behind repository interfaces.
- **Message Broker**: Confluent.Kafka integration with Apache Kafka.
- **HTTP Integration**: `WebApplicationFactory<Program>` in ASP.NET Core for end-to-end API pipeline testing.

---

## 2. Integration Test Suites Summary

| Test Project | Integration Scope | Backing Container | Result |
|:---|:---|:---|:---:|
| `Harbor.Authentication.IntegrationTests` | User repository, migration runner, BCrypt persistence, refresh token lifecycle | PostgreSQL 15 | **PASSED** |
| `Harbor.Project.IntegrationTests` | Project/service CRUD, public IDs, custom domain mappings, migration runner | PostgreSQL 15 | **PASSED** |
| `Harbor.Environment.IntegrationTests` | Environment tiers, deactivation state, encrypted secret storage, migration runner | PostgreSQL 15 | **PASSED** |
| `Harbor.Deployment.IntegrationTests` | Deployment repository, status reconciliation, notification repository, migrations | PostgreSQL 15 | **PASSED** |
| `Harbor.Reporting.IntegrationTests` | Cross-service parameterized deployment reporting, audit log queries | PostgreSQL 15 | **PASSED** |
| `Harbor.Kafka.IntegrationTests` | Producer/consumer lifecycle, `DeploymentLifecycleEvent` serialization and commits | Apache Kafka | **PASSED** |
| `Harbor.Observability.IntegrationTests` | Prometheus metrics scraping, health probe aggregations | Test Host | **PASSED** |

---

## 3. Representative Integration Test Cases

### TC-INT-001: PostgreSQL Database Connectivity & Migration Execution
- **Jira Story:** US-01 - Application Foundation
- **Requirement:** Backend services must connect to PostgreSQL and apply pending migrations automatically.
- **Acceptance Criterion:** The application establishes an Npgsql connection pool and executes versioned SQL scripts (`schema_versions` updated).
- **Test Type:** Integration (Testcontainers)
- **Priority:** High
- **Preconditions:** Docker engine active. Testcontainers pulls `postgres:15-alpine`.
- **Test Steps:**
  1. Initialize `PostgreSqlContainer` fixture.
  2. Invoke `DatabaseInitializer.InitializeAsync()` with connection string.
  3. Query `schema_versions` table.
- **Expected Result:** Database initializes; all migration scripts execute in order; `schema_versions` records applied scripts.
- **Actual Result:** Connection established; all 10+ migrations executed atomically; `schema_versions` verified.
- **Status:** **PASS**
- **Evidence:** Test suite `MigrationRunnerTests.cs` passed in 1.42s.

### TC-INT-002: Notification Creation on Deployment Completion
- **Jira Story:** US-21 - Deployment Notifications
- **Requirement:** Terminal deployment state must automatically persist user notification.
- **Acceptance Criterion:** `NotificationAwareDeploymentRepository` inserts notification record with `IsRead=FALSE` when deployment status updates to `Succeeded` or `Failed`.
- **Test Type:** Integration
- **Priority:** High
- **Test Steps:**
  1. Insert seed deployment record.
  2. Update status to `Succeeded` using `UpdateStatusAsync()`.
  3. Query `notifications` table for `UserId`.
- **Expected Result:** Notification record inserted with title `"Deployment Succeeded"` and matching deployment ID.
- **Actual Result:** Notification verified in database with `IsRead=FALSE`.
- **Status:** **PASS**
- **Evidence:** Test suite `NotificationRepositoryTests.cs` passed.

### TC-INT-003: Cross-Service Parameterized Deployment Report Filtering
- **Jira Story:** US-22 - Deployment Reporting
- **Requirement:** Reporting service queries deployment and project tables with parameterized filters.
- **Acceptance Criterion:** Query filters accurately by project ID, environment, and status without SQL syntax errors or injection vectors.
- **Test Type:** Integration
- **Priority:** High
- **Test Steps:**
  1. Seed 10 deployments across multiple environments (`Development`, `Staging`, `Production`).
  2. Call `DeploymentReportRepository.GetReportRowsAsync()` with `environment = "Staging"`.
- **Expected Result:** Returns strictly Staging records with populated project and service metadata.
- **Actual Result:** Parameterized SQL executes in < 15ms; accurate row count returned.
- **Status:** **PASS**
- **Evidence:** Test suite `DeploymentReportRepositoryTests` passed.
