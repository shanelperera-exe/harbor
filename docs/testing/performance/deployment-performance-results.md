# JMeter Performance Test Results — US-19 Deployment Details

## Overview
This document captures the metrics resulting from the JMeter performance test execution for
User Story US-19 (View Deployment Details and Logs).

*Note: Measurements are placeholders until the test is executed.*

## Execution Details
- **Date:** `[TO BE COMPLETED]`
- **Environment:** Local development (Docker Compose)
- **JMeter version:** 5.6.3
- **Test plan:** `tests/performance/DeploymentDetailsLoadTest.jmx`
- **Scenario:** US-19 Deployment Details and Logs — three scenarios (baseline, large payload, concurrent load)

## Test Data

| Scenario | Deployment Public ID | Log Row Count | Description |
|---|---|---|---|
| A — Baseline | `qa_seed_dep_failed` | ~4 | Seeded by `scripts/ci/seed-deployment-data.sh` |
| B — Large Payload | `qa_seed_dep_perf_large` | 2,000 | Seeded by `scripts/ci/seed-performance-data.sh` |
| C — Concurrent Load | `qa_seed_dep_perf_large` | 2,000 | Same deployment as B, 50 users x 10 iterations |

## Load Configuration

| Parameter | Scenario A | Scenario B | Scenario C |
|---|---|---|---|
| Concurrent users | 1 | 1 | 50 |
| Ramp-up (seconds) | 1 | 1 | 10 |
| Iterations per user | 1 | 1 | 10 |
| Total requests | 1 | 1 | 500 |
| Target endpoint | `GET /api/deployments/{id}` | `GET /api/deployments/{id}` | `GET /api/deployments/{id}` |
| Gateway | `http://localhost:5053` | `http://localhost:5053` | `http://localhost:5053` |

## Metrics Summary

### Scenario A — Baseline

| Metric | Value |
|---|---|
| Total requests | `[TO BE COMPLETED]` |
| Average response time | `[TO BE COMPLETED]` ms |
| Minimum response time | `[TO BE COMPLETED]` ms |
| Maximum response time | `[TO BE COMPLETED]` ms |
| 90th percentile | `[TO BE COMPLETED]` ms |
| 95th percentile | `[TO BE COMPLETED]` ms |
| Throughput | `[TO BE COMPLETED]` req/sec |
| Error percentage | `[TO BE COMPLETED]` % |
| Average response size (bytes) | `[TO BE COMPLETED]` |

### Scenario B — Large Log Payload (2,000 rows)

| Metric | Value |
|---|---|
| Total requests | `[TO BE COMPLETED]` |
| Average response time | `[TO BE COMPLETED]` ms |
| Minimum response time | `[TO BE COMPLETED]` ms |
| Maximum response time | `[TO BE COMPLETED]` ms |
| 90th percentile | `[TO BE COMPLETED]` ms |
| 95th percentile | `[TO BE COMPLETED]` ms |
| Throughput | `[TO BE COMPLETED]` req/sec |
| Error percentage | `[TO BE COMPLETED]` % |
| Average response size (bytes) | `[TO BE COMPLETED]` |

### Scenario C — Concurrent Load (50 users x 10 iterations)

| Metric | Value |
|---|---|
| Total requests | `[TO BE COMPLETED]` |
| Average response time | `[TO BE COMPLETED]` ms |
| Minimum response time | `[TO BE COMPLETED]` ms |
| Maximum response time | `[TO BE COMPLETED]` ms |
| 90th percentile | `[TO BE COMPLETED]` ms |
| 95th percentile | `[TO BE COMPLETED]` ms |
| Throughput | `[TO BE COMPLETED]` req/sec |
| Error percentage | `[TO BE COMPLETED]` % |
| Average response size (bytes) | `[TO BE COMPLETED]` |

## Observations
`[TO BE COMPLETED: General observations from the test run, e.g., whether log sanitization overhead is visible, whether the unbounded log query causes latency spikes, etc.]`

## Bottlenecks Identified
`[TO BE COMPLETED: Any specific endpoints or services that struggled under load]`

## Recommendations
`[TO BE COMPLETED: Suggested improvements, e.g., log pagination, streaming, caching]`

## Pass/Fail
- **Scenario A:** `[TO BE COMPLETED]`
- **Scenario B:** `[TO BE COMPLETED]`
- **Scenario C:** `[TO BE COMPLETED]`

## Known Limitations
- No official performance SLA exists for the Harbor APIs, so results are measured and reported rather than passed/failed against a threshold.
- `GetLogsAsync` retrieves all log rows without pagination or a LIMIT; Scenario B measures the current behaviour, not a target.
- JMeter tests are not currently executed in CI; results are collected manually.
- The 2,000-log fixture is synthetic; real GitHub Actions log content may differ in size and structure.
