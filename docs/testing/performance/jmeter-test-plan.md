# JMeter Performance Test Plan — Complete Harbor Platform

## 1. Overview
This document outlines the performance, load, stress, and end-to-end integration testing strategy for the Harbor platform using Apache JMeter 5.6.3.

The performance suite covers all microservices in the Harbor ecosystem:
1. `Harbor.ApiGateway` (Reverse proxy, routing transforms, health monitoring)
2. `Harbor.Authentication` (User registration, BCrypt hashing, JWT issuance & verification, Redis blacklist)
3. `Harbor.Project` (Project lifecycle, service catalog, repository metadata)
4. `Harbor.Environment` (Environment variables, AES encrypted secrets management)
5. `Harbor.Deployment` (Deployment history, large log streaming, dashboard metrics, notification center)
6. `Harbor.Reporting` (Deployment reports, CSV exports, multi-criteria filtering, admin audit trails)

---

## 2. Test Execution Engine & Commands

Tests can be executed individually via JMeter CLI or collectively via the automated test suite runner:

### 2.1 Automated Full Suite Execution
```bash
# Execute all 20 performance test plans against local Docker stack:
python3 scripts/performance/run-performance-suite.py

# Or with custom target host/port:
API_HOST=localhost API_PORT=5000 python3 scripts/performance/run-performance-suite.py
```

### 2.2 Individual Test Execution
```bash
# Example: Run E2E User Journey
jmeter -n -t tests/performance/HarborEndToEndUserJourneyLoadTest.jmx \
  -Japi_host=localhost -Japi_port=5000 \
  -l tests/performance/results/HarborEndToEndUserJourneyLoadTest.jtl

# Example: Run Deployment Details Large Payload (US-19)
jmeter -n -t tests/performance/DeploymentDetailsLoadTest.jmx \
  -Japi_host=localhost -Japi_port=5000 -Jjwt_token="<TOKEN>" \
  -l tests/performance/results/DeploymentDetailsLoadTest.jtl
```

---

## 3. Test Suite Inventory

| # | Test Plan File | Microservice | Primary Endpoint | Workload Model |
|:---|:---|:---|:---|:---|
| 1 | `GatewayHealthBaseline.jmx` | API Gateway | `GET /health` | 50 threads x 10 loops (500 samples) |
| 2 | `AuthJWTValidationTest.jmx` | Authentication | `GET /api/protected/developer-area` | 50 threads x 10 loops (500 samples) |
| 3 | `AuthRegistrationTest.jmx` | Authentication | `POST /api/auth/register` | 50 threads x 10 loops (500 samples) |
| 4 | `AuthLoadTest.jmx` | Authentication | `POST /api/auth/login` | 50 threads x 10 loops (500 samples) |
| 5 | `AuthSpikeTest.jmx` | Authentication | `POST /api/auth/login` | 100 threads surge within 3s (500 samples) |
| 6 | `AuthStressTest.jmx` | Authentication | `POST /api/auth/login` | 200 threads x 5 loops (1,000 samples) |
| 7 | `ProjectCatalogLoadTest.jmx` | Project | `GET /api/projects`, `.../services` | 25 threads x 10 loops (500 samples) |
| 8 | `EnvironmentConfigLoadTest.jmx` | Environment | `GET /api/projects/.../environments` | 20 threads x 10 loops (200 samples) |
| 9 | `DashboardBaseline.jmx` | Deployment | `GET /api/deployments/dashboard` | 1 thread x 10 loops (10 samples) |
| 10 | `DashboardLoadTest.jmx` | Deployment | `GET /api/deployments/dashboard` | 10 & 50 users (700 samples) |
| 11 | `DeploymentHistoryLoadTest.jmx` | Deployment | `GET /api/deployments` (filtered) | 20 threads x 10 loops (600 samples) |
| 12 | `DeploymentDetailsBaseline.jmx` | Deployment | `GET /api/deployments/qa_seed_dep_failed` | Single user baseline |
| 13 | `DeploymentDetailsLargePayload.jmx` | Deployment | `GET /api/deployments/qa_seed_dep_perf_large` | 2,000 log lines payload baseline |
| 14 | `DeploymentDetailsConcurrentLoad.jmx` | Deployment | `GET /api/deployments/qa_seed_dep_perf_large` | 50 concurrent users x 10 loops (500 samples) |
| 15 | `DeploymentDetailsLoadTest.jmx` | Deployment | `GET /api/deployments/...` (US-19) | Multi-scenario suite (502 samples) |
| 16 | `NotificationLoadTest.jmx` | Deployment | `GET /api/notifications` | 20 threads x 10 loops (400 samples) |
| 17 | `DeploymentReportBaseline.jmx` | Reporting | `GET /api/reports/deployments` | Single user baseline (10 samples) |
| 18 | `DeploymentReportLoadTest.jmx` | Reporting | `GET /api/reports/deployments` | 25 users x 5 loops (500 samples) |
| 19 | `AuditLogsLoadTest.jmx` | Reporting | `GET /api/reports/audit` | 20 users x 5 loops (100 samples) |
| 20 | `HarborEndToEndUserJourneyLoadTest.jmx` | All Services | 10-step full developer workflow | 15 users x 5 loops (750 samples) |

---

## 4. Test Data & Fixtures

| Fixture Identifier | Seeding Script | Description |
|:---|:---|:---|
| `qa_tester2` | `scripts/ci/seed-deployment-data.sh` | Main authenticated developer user |
| `admin` | `Harbor.Authentication/Program.cs` | Administrator user for audit trail testing |
| `qa_seed_proj_001` | `scripts/ci/seed-deployment-data.sh` | Seeded project with services & environments |
| `qa_seed_dep_failed` | `scripts/ci/seed-deployment-data.sh` | Failed deployment record with ~4 logs |
| `qa_seed_dep_perf_large` | `scripts/ci/seed-performance-data.sh` | Deployment record with 2,000 execution logs |

---

## 5. Performance SLAs & Acceptance Criteria

- **Gateway & In-Memory Operations**: Average latency < 20 ms, p95 < 50 ms.
- **Database Query Operations**: Average latency < 50 ms, p95 < 100 ms.
- **CPU-Bound Hashing (BCrypt work factor 11)**: Average latency < 250 ms, p95 < 350 ms.
- **Error Rate Threshold**: < 1.0% under normal load; < 5.0% under extreme saturation stress.
- **Data Integrity**: Zero authentication leakages, zero container crashes, zero deadlocks.
