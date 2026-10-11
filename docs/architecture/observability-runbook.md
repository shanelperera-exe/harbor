# Harbor Observability & Monitoring Runbook

This runbook outlines the operational monitoring, telemetry endpoints, dashboards, alerting rules, and troubleshooting procedures for the Harbor platform.

---

## 1. Quick Reference: Endpoints & Ports

| Component / Service | Port | Health Endpoints | Metrics Endpoint |
| :--- | :--- | :--- | :--- |
| **Harbor API Gateway** | `5000` / `8080` | `/health`, `/health/live`, `/health/ready` | `/metrics` |
| **Harbor Authentication** | `5001` / `8080` | `/health`, `/health/live`, `/health/ready` | `/metrics` |
| **Harbor Project Service** | `5002` / `8080` | `/health`, `/health/live`, `/health/ready` | `/metrics` |
| **Harbor Environment Service** | `5003` / `8080` | `/health`, `/health/live`, `/health/ready` | `/metrics` |
| **Harbor Deployment Service** | `5004` / `8080` | `/health`, `/health/live`, `/health/ready` | `/metrics` |
| **Harbor Reporting Service** | `5005` / `8080` | `/health`, `/health/live`, `/health/ready` | `/metrics` |
| **Prometheus Server** | `9090` | N/A | `http://localhost:9090/targets` |
| **Grafana UI** | `3000` | N/A | `http://localhost:3000` (`admin`/`admin`) |

---

## 2. Health Monitoring (Scenario 1)

All Harbor services implement ASP.NET Core Health Checks conforming to Kubernetes and cloud-native container probing conventions:

### 2.1 `/health/live` (Liveness Probe)
* **Purpose:** Confirms the HTTP server process is running and not deadlocked.
* **HTTP Status:** `200 OK` when process is responsive.
* **Response:**
  ```json
  { "status": "Healthy" }
  ```

### 2.2 `/health/ready` (Readiness Probe)
* **Purpose:** Verifies that backing stores (PostgreSQL, Redis, Kafka) are connected and ready to accept traffic.
* **HTTP Status:** `200 OK` when healthy; `503 Service Unavailable` if an essential dependency is down.
* **Response:**
  ```json
  {
    "status": "Healthy",
    "totalDuration": "00:00:00.0034201",
    "entries": {
      "self": { "status": "Healthy", "duration": "00:00:00.0001000", "description": "Harbor.Deployment is running" },
      "database": { "status": "Healthy", "duration": "00:00:00.0023100", "description": "Database connection verified" },
      "redis": { "status": "Healthy", "duration": "00:00:00.0008500", "description": "Redis cache is accessible" }
    }
  }
  ```

### 2.3 `/health` (Aggregated Status)
* **Purpose:** General purpose health check for load balancers and operator dashboards.

---

## 3. Metrics & Grafana Dashboards

### 3.1 Prometheus Scraper
* Scrapes all Harbor services every 15 seconds at `/metrics`.
* Scraper configuration located at `infrastructure/monitoring/prometheus/prometheus.yml`.

### 3.2 Pre-Provisioned Grafana Dashboards
Navigate to `http://localhost:3000` -> **Dashboards** -> **Harbor Observability**:

1. **Harbor System Overview & Golden Signals (`harbor-system-overview`)**:
   * Direct Link: `http://localhost:3000/d/harbor-system-overview/harbor-system-overview-and-golden-signals`
   * **Real-time Status Matrix:** UP/DOWN indicators across all microservices.
   * **Golden Signals:** Total Throughput (RPS), Global P95 Latency, 5xx Server Error Rate, and Active Kestrel Connections.
   * **Resource Saturation:** Process working set memory and CPU utilization per microservice.

2. **Harbor Deployment Operations & Event Telemetry (`harbor-deployment-operations`)**:
   * Direct Link: `http://localhost:3000/d/harbor-deployment-operations/harbor-deployment-operations-and-event-telemetry`
   * **KPI Stat Strip:** Total Operations, Succeeded, Failed, In-Progress / Running, Success Rate %, and P90 Duration.
   * **Distribution Donut Charts:** Operations breakdown by status and environment.
   * **Deployment Throughput:** Deployments per hour by environment and status.
   * **Multi-Percentile Latency:** P50, P90, and P99 deployment duration curves.

3. **Harbor .NET Runtime & Infrastructure Diagnostics (`harbor-runtime-infrastructure`)**:
   * Direct Link: `http://localhost:3000/d/harbor-runtime-infrastructure/harbor-net-runtime-and-infrastructure-diagnostics`
   * **Host & Resource Saturation:** Real-time CPU % per microservice and Process Working Set memory.
   * **Memory & Garbage Collection:** Working Set vs. GC Heap committed size, GC Pause time rates, and collection cycles.
   * **ThreadPool & Concurrency Health:** ThreadPool thread counts, work item queue lengths (starvation detection), and lock contentions.
   * **CLR Exceptions Rate:** Real-time exception throw rates by microservice.

4. **Harbor Edge Traffic & Ingress Networking (`harbor-traffic-gateway`)**:
   * Direct Link: `http://localhost:3000/d/harbor-traffic-gateway/harbor-edge-traffic-and-ingress-networking`
   * **Gateway Ingress:** RPS throughput, P50/P90/P99 latency curves, and 5xx/4xx error rates.
   * **Status Codes:** Real-time stacked bars of 2xx, 3xx, 4xx, and 5xx responses.
   * **Outbound Client Dependencies:** Started vs. failed outbound HTTP requests (GitHub API, webhooks) and outbound P95 latency.

5. **Harbor Kafka Event Bus & Messaging Telemetry (`harbor-kafka-events`)**:
   * Direct Link: `http://localhost:3000/d/harbor-kafka-events/harbor-kafka-event-bus-and-messaging-telemetry`
   * **Broker Channel Status:** Producer connectivity to `kafka:9092`.
   * **Event Emission Rates:** Total broadcast events and publishing rate per second.
   * **Transition Flow:** Pending -> Running -> Succeeded / Failed event distribution.

---

## 4. Live Alerting Rules (13 Rules)

Alert definitions are configured in `infrastructure/monitoring/prometheus/alert_rules.yml`:

| Group | Alert Name | Condition | Severity | Description & Action |
| :--- | :--- | :--- | :--- | :--- |
| **Availability** | `HarborServiceDown` | `up == 0` for 30s | Critical | Service instance is unreachable. Check container logs or Azure Container App replicas. |
| **Availability** | `HarborApiGatewayDown` | `up{job="harbor-api-gateway"} == 0` for 15s | Critical | Ingress Gateway is down. External users cannot reach Harbor. |
| **Availability** | `HarborHighHttp5xxErrorRate` | 5xx errors > 5% of traffic over 2m | Critical | Spike in unhandled server errors. Inspect error logs by `CorrelationId`. |
| **Availability** | `HarborHighHttp4xxErrorRate` | 4xx errors > 25% of traffic over 3m | Warning | Spike in client-side errors. Check JWT expiration or API contracts. |
| **Performance** | `HarborDegradedLatencyP95` | P95 latency > 2s for 2m | Warning | Performance degradation. Check database connection pool or Redis latency. |
| **Performance** | `HarborCriticalLatencyP99` | P99 latency > 5s for 1m | Critical | Severe latency spike affecting tail requests. |
| **Performance** | `HarborHighCpuUsage` | CPU usage > 85% for 3m | Warning | Sustained high CPU utilization. Consider scaling replicas. |
| **Performance** | `HarborHighMemoryWorkingSet` | Memory > 600MB for 3m | Warning | Memory leak or high payload cache. Inspect GC heap diagnostics. |
| **Performance** | `HarborThreadPoolStarvation` | ThreadPool queue > 10 for 1m | Critical | Thread pool starvation detected. Inspect synchronous blocking calls. |
| **Performance** | `HarborHighExceptionRate` | Exceptions > 10/s for 1m | Warning | Spike in CLR exceptions. Check database timeouts or invalid payloads. |
| **Deployments** | `HarborDeploymentFailureBurst` | >= 3 failures in 10m | Critical | Consecutive failures in an environment. Check GitHub token or runner status. |
| **Deployments** | `HarborDeploymentSuccessRateDrop` | Success rate < 80% for 10m | Warning | Deployment success dropped below 80%. |
| **Dependencies** | `HarborOutboundDependencyFailures` | Outbound failures > 10% for 2m | Warning | Upstream API failures (GitHub API, Mailpit, or webhooks). |

---

## 5. Troubleshooting Procedures (Scenario 3)

### 5.1 Tracing a Request via `X-Correlation-ID`
1. Every HTTP response from Harbor includes the `X-Correlation-ID` header.
2. In frontend bug reports or failed API calls, capture this ID (e.g. `c748c1f9-03b1-4235-9005-4c07b6f387ea`).
3. Search logs for the correlation ID:
   ```bash
   docker logs harbor-deployment 2>&1 | grep "c748c1f9-03b1-4235-9005-4c07b6f387ea"
   ```
4. All log entries across middleware, services, and repositories sharing this ID will be displayed in chronological sequence.

### 5.2 RFC 7807 ProblemDetails Error Codes
When an error occurs, Harbor APIs return standard `application/problem+json`:
* `HARBOR_ERR_INTERNAL`: Unhandled server exception (details sanitized in response, full stack in server log).
* `HARBOR_ERR_BAD_REQUEST`: Client input validation failure.
* `HARBOR_ERR_UNAUTHORIZED`: Authentication or token verification failure.
* `HARBOR_ERR_DB_UNAVAILABLE`: Upstream database connectivity interruption.

---

## 6. Sensitive Information Protection (Scenario 4)

All loggers are guarded by `HarborSensitiveDataScrubber`:
* **Never logged:** Passwords, JWT Bearer tokens, GitHub Personal Access Tokens (`ghp_*`), Azure Event Hubs shared access keys, AES encryption keys (`ENVIRONMENT_SECRETS_KEY`).
* When detected, values are automatically replaced with `[REDACTED]`.
