# JMeter Performance Test Plan

## Overview
This document outlines the performance, load, and stress testing strategy for the Harbor backend APIs using Apache JMeter.

*Note: Numerical targets have not yet been defined by the project for US1. This is a template for future testing.*

## 1. Objectives
- Validate the Harbor application's stability under expected load.
- Identify performance bottlenecks in the API or database layer.
- Measure API response times against defined thresholds.

## 2. Scope
Targeted REST API endpoints supporting high-traffic user journeys.

## 3. Target APIs / Features

| API | Method | Path | Purpose |
|---|---|---|---|
| Harbor Authentication | POST | `/api/Auth/login` | Obtain JWT for authenticated tests |
| Harbor API Gateway | GET | `/api/deployments/{publicId}` | **US-19: Deployment details and logs** |
| Harbor API Gateway | GET | `/api/deployments` | Deployment history list (paginated) |

### US-19 Deployment Details

The `GET /api/deployments/{publicId}` endpoint returns deployment metadata, failure information,
and all log rows for a single deployment. It is tested through the API Gateway at
`http://localhost:5053` (not directly against the Deployment service).

Key characteristics:
- Logs are retrieved via `GetLogsAsync` with **no LIMIT or pagination** — the entire log set
  is loaded, sanitized, and serialized in one pass.
- The endpoint joins `Deployments` → `Services` → `Projects` → `Users` and additionally
  queries `ServiceAccess` and `Environments` for the deployment URL.
- Log messages, `FailureReason`, and `TriggerError` are sanitized through
  `DeploymentLogSanitizer` before being returned.

## 4. Load Model

| Scenario | Model | Rationale |
|---|---|---|
| A — Baseline | Single user, single request | Establish normal response time for a deployment with few logs |
| B — Large Payload | Single user, single request | Measure performance impact of 2,000 log rows |
| C — Concurrent Load | 50 users, 10 iterations each (500 total requests) | Measure system behaviour under sustained concurrent load |

## 5. Load Parameters

- **Concurrent users:** 50 (Scenario C); 1 (Scenarios A and B)
- **Ramp-up period (seconds):** 10 (Scenario C); 1 (Scenarios A and B)
- **Iterations per user:** 10 (Scenario C); 1 (Scenarios A and B)
- **Think time:** None (back-to-back requests)
- **Target host:** `localhost`
- **Target port:** `5053` (API Gateway)

## 6. Test Scenarios

### Scenario A — Baseline (Small Logs)
- **Deployment:** `qa_seed_dep_failed` (~4 log rows, seeded by `seed-deployment-data.sh`)
- **Objective:** Establish normal response-time baseline

### Scenario B — Large Log Payload (2,000 rows)
- **Deployment:** `qa_seed_dep_perf_large` (2,000 log rows, seeded by `seed-performance-data.sh`)
- **Objective:** Measure latency and payload size when returning and sanitizing a large log set

### Scenario C — Concurrent Load (50 users x 10 iterations)
- **Deployment:** `qa_seed_dep_perf_large` (2,000 log rows)
- **Objective:** Measure throughput, error rate, and resource behaviour under concurrent load

## 7. Test Data

| Fixture | Source | Row Count |
|---|---|---|
| `qa_seed_dep_failed` | `scripts/ci/seed-deployment-data.sh` | ~4 log rows |
| `qa_seed_dep_perf_large` | `scripts/ci/seed-performance-data.sh` | 2,000 log rows |

## 8. Metrics to Monitor

- Response time (Avg, Min, Max, 90th/95th Percentile)
- Throughput (Requests per second)
- Error rate (%)
- Response size in bytes

## 9. Acceptance Criteria

No official performance SLA is defined for Harbor APIs. Results are measured and reported.
Future SLO definitions should target:
- 95th percentile response time for Scenario B: TBD
- Error rate: < 1%
- Throughput: TBD

## 10. Environment

Performance tests are executed against a local Docker Compose environment.

## 11. JMeter Artifact Location

- Test plan: `tests/performance/DeploymentDetailsLoadTest.jmx`
- Results template: `docs/testing/performance/deployment-performance-results.md`
