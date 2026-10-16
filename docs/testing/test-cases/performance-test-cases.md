# Harbor Performance Test Cases Specification

## 1. Overview
This document specifies performance and load test cases for the Harbor platform executed using Apache JMeter.

### Performance Testing Scope:
- **Authentication & Security**: JWT token validation, user registration, BCrypt password hashing throughput, login load, spike, and stress testing.
- **API Gateway**: Health monitoring latency, routing overhead, and high-frequency readiness probe handling.
- **Projects & Services**: Project listing, tenant isolation, and service catalog query performance under load.
- **Environments**: Environment variable retrieval and AES decrypted secret streaming.
- **Deployments & Dashboard**: Operational dashboard summary, paginated deployment history with multi-criteria filtering, and US-19 2,000-line log streaming.
- **Notifications**: In-app notification center polling and unread counter queries.
- **Reporting & Auditing**: Filtered deployment reports, execution analytics, and administrative audit trails.
- **End-to-End User Journeys**: Full 10-step simulated developer session testing entire multi-service integration under load.

---

## 2. Master Performance Test Cases Register

| Test Case ID | Target Feature | Test Plan File | Target Metric | Actual Result | Status |
|:---|:---|:---|:---|:---|:---:|
| `TC-PERF-GW01` | Gateway Health Check | `GatewayHealthBaseline.jmx` | Avg < 20ms, Error = 0% | Avg: **2.40 ms**, p95: **4.00 ms**, Error: **0.00%** | **PASS** |
| `TC-PERF-001` | JWT Token Validation | `AuthJWTValidationTest.jmx` | Avg < 20ms, Error < 1% | Avg: **5.00 ms**, p95: **10.00 ms**, Error: **0.00%** | **PASS** |
| `TC-PERF-002` | User Registration & BCrypt | `AuthRegistrationTest.jmx` | Avg < 250ms, Error < 1% | Avg: **116.18 ms**, p95: **124.00 ms**, Error: **0.00%** | **PASS** |
| `TC-PERF-AUTH01` | User Login Throughput | `AuthLoadTest.jmx` | Avg < 250ms, Error < 1% | Avg: **114.47 ms**, p95: **125.00 ms**, Error: **0.00%** | **PASS** |
| `TC-PERF-AUTH02` | Auth Traffic Spike (100 threads) | `AuthSpikeTest.jmx` | Handled, Error < 5% | Avg: **480.53 ms**, p95: **966.00 ms**, Error: **0.00%** | **PASS** |
| `TC-PERF-AUTH03` | Extreme Auth Stress (1,000 samples) | `AuthStressTest.jmx` | Handled, Error < 5% | Avg: **220.34 ms**, p95: **350.00 ms**, Error: **0.00%** | **PASS** |
| `TC-PERF-PRJ01` | Project & Service Catalog | `ProjectCatalogLoadTest.jmx` | Avg < 50ms, Error < 1% | Avg: **4.82 ms**, p95: **10.00 ms**, Error: **0.00%** | **PASS** |
| `TC-PERF-ENV01` | Environment Configuration | `EnvironmentConfigLoadTest.jmx` | Avg < 50ms, Error < 1% | Avg: **10.88 ms**, p95: **15.00 ms**, Error: **0.00%** | **PASS** |
| `TC-US20-004A` | Dashboard Summary Baseline | `DashboardBaseline.jmx` | Avg < 50ms, Error = 0% | Avg: **8.90 ms**, p95: **23.00 ms**, Error: **0.00%** | **PASS** |
| `TC-US20-004B` | Dashboard Concurrent Load | `DashboardLoadTest.jmx` | Avg < 50ms, Error < 1% | Avg: **10.56 ms**, p95: **19.00 ms**, Error: **0.00%** | **PASS** |
| `TC-PERF-DEP01` | Deployment History & Filtering | `DeploymentHistoryLoadTest.jmx` | Avg < 50ms, Error < 1% | Avg: **9.02 ms**, p95: **15.00 ms**, Error: **0.00%** | **PASS** |
| `US19-PERF-01` | Deployment Details Baseline | `DeploymentDetailsBaseline.jmx` | Avg < 50ms, Error = 0% | Avg: **30.00 ms**, p95: **30.00 ms**, Error: **0.00%** | **PASS** |
| `US19-PERF-02` | Large Log Payload (2,000 rows) | `DeploymentDetailsLargePayload.jmx` | Avg < 100ms, Error = 0% | Avg: **37.00 ms**, p95: **37.00 ms**, Error: **0.00%** | **PASS** |
| `US19-PERF-03` | Deployment Details Concurrent Load | `DeploymentDetailsConcurrentLoad.jmx` | Avg < 100ms, Error < 1% | Avg: **17.88 ms**, p95: **34.00 ms**, Error: **0.00%** | **PASS** |
| `US19-PERF-04` | Deployment Details Multi-Scenario | `DeploymentDetailsLoadTest.jmx` | Avg < 100ms, Error < 1% | Avg: **11.78 ms**, p95: **22.00 ms**, Error: **0.00%** | **PASS** |
| `TC-PERF-NOT01` | Notification Center Polling | `NotificationLoadTest.jmx` | Avg < 50ms, Error < 1% | Avg: **8.32 ms**, p95: **15.00 ms**, Error: **0.00%** | **PASS** |
| `TC-US22-015A` | Deployment Report Baseline | `DeploymentReportBaseline.jmx` | Avg < 50ms, Error = 0% | Avg: **7.80 ms**, p95: **23.00 ms**, Error: **0.00%** | **PASS** |
| `TC-US22-015B` | Deployment Report Multi-Filter | `DeploymentReportLoadTest.jmx` | Avg < 50ms, Error < 1% | Avg: **8.65 ms**, p95: **15.00 ms**, Error: **0.00%** | **PASS** |
| `TC-PERF-AUD01` | Admin Audit Log Query | `AuditLogsLoadTest.jmx` | Avg < 50ms, Error < 1% | Avg: **8.51 ms**, p95: **13.00 ms**, Error: **0.00%** | **PASS** |
| `TC-PERF-E2E01` | Full User Journey (10 Steps) | `HarborEndToEndUserJourneyLoadTest.jmx` | Avg < 100ms, Error < 1% | Avg: **15.43 ms**, p95: **114.00 ms**, Error: **0.00%** | **PASS** |

---

## 3. Detailed Case Specifications

### TC-PERF-GW01: API Gateway Health Probe Latency
- **Endpoint**: `GET /health`
- **Objective**: Measure reverse proxy routing overhead and health check responsiveness under 50 concurrent threads.
- **SLA Target**: Latency < 20ms, Error = 0%.
- **Actual**: Average: **2.40 ms**, p95: **4.00 ms**, Error: **0.00%**, Throughput: **102.6 req/s**.
- **Verdict**: **PASS**

### TC-PERF-001: JWT Validation Latency & Blacklist Verification
- **Endpoint**: `GET /api/protected/developer-area`
- **Objective**: Measure in-memory cryptographic signature verification and Redis blacklist lookup latency under load.
- **SLA Target**: Latency < 20ms, Error < 1%.
- **Actual**: Average: **5.00 ms**, p95: **10.00 ms**, Error: **0.00%**, Throughput: **50.9 req/s**.
- **Verdict**: **PASS**

### TC-PERF-002: User Registration & BCrypt Work Factor 11
- **Endpoint**: `POST /api/auth/register`
- **Objective**: Validate CPU-bound salted BCrypt password hashing throughput and database insertion.
- **SLA Target**: Latency < 250ms, Error < 1%.
- **Actual**: Average: **116.18 ms**, p95: **124.00 ms**, Error: **0.00%**, Throughput: **46.4 req/s**.
- **Verdict**: **PASS**

### TC-PERF-PRJ01: Project Catalog & Services Retrieval
- **Endpoint**: `GET /api/projects`, `GET /api/projects/{id}/services`
- **Objective**: Measure multi-tenant project browsing and service catalog retrieval latency under concurrent user queries.
- **SLA Target**: Latency < 50ms, Error < 1%.
- **Actual**: Average: **4.82 ms**, p95: **10.00 ms**, Error: **0.00%**, Throughput: **104.1 req/s**.
- **Verdict**: **PASS**

### TC-US20-004B: Dashboard Aggregation Under Load
- **Endpoint**: `GET /api/deployments/dashboard`
- **Objective**: Measure simultaneous fetching of user projects, recent deployment activities, and status metrics under 10 and 50 concurrent users.
- **SLA Target**: Latency < 50ms, Error < 1%.
- **Actual**: Average: **10.56 ms**, p95: **19.00 ms**, Error: **0.00%**, Throughput: **23.8 req/s**.
- **Verdict**: **PASS**

### US19-PERF-02: 2,000-Row Deployment Execution Logs
- **Endpoint**: `GET /api/deployments/qa_seed_dep_perf_large`
- **Objective**: Benchmark payload serialization, sanitization, and network streaming for high-volume execution logs (2,000 lines, ~185 KB).
- **SLA Target**: Latency < 100ms, Error = 0%.
- **Actual**: Average: **37.00 ms**, p95: **37.00 ms**, Error: **0.00%**.
- **Verdict**: **PASS**

### TC-PERF-E2E01: Complete 10-Step End-to-End User Lifecycle
- **Workload**: 15 concurrent developers looping through:
  1. Health probe -> 2. Login -> 3. Dashboard -> 4. Projects -> 5. Services -> 6. Environments -> 7. Deployment History -> 8. Execution Logs (2,000 rows) -> 9. Notifications -> 10. Reports.
- **Objective**: Validate full cross-microservice operational resilience and data integrity under concurrent user sessions.
- **SLA Target**: Latency < 100ms, Error < 1%.
- **Actual**: Total Samples: **750**, Errors: **0 (0.00%)**, Average Latency: **15.43 ms**, p95: **114.00 ms**, Throughput: **139.2 req/s**.
- **Verdict**: **PASS**
