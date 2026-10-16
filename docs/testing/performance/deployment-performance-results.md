# JMeter Performance Test Results — US-19 Deployment Details

## 1. Overview
This document records the performance benchmarking metrics for User Story **US-19 (View Deployment Details and Logs)**.

The test validates response times, serialization efficiency, and database retrieval speeds when fetching deployment records and execution logs under three distinct load scenarios:
- **Scenario A**: Baseline single request (small log payload).
- **Scenario B**: Large log payload retrieval (2,000 log lines).
- **Scenario C**: Concurrent multi-user load (50 concurrent users x 10 iterations = 500 requests).

---

## 2. Execution Configuration

- **Date**: October 2026
- **Environment**: Local Docker Compose stack
- **JMeter Version**: 5.6.3
- **Test Plan**: `tests/performance/DeploymentDetailsLoadTest.jmx`
- **Target Endpoint**: `GET /api/deployments/{id}` via API Gateway (`http://localhost:5000`)
- **Authentication**: Pre-authenticated Bearer JWT token header

### Test Data Sets
| Scenario | Deployment Public ID | Log Row Count | Description |
|:---|:---|:---:|:---|
| **A — Baseline** | `qa_seed_dep_failed` | ~4 lines | Baseline failed deployment record |
| **B — Large Payload** | `qa_seed_dep_perf_large` | 2,000 lines | Seeded via `scripts/ci/seed-performance-data.sh` |
| **C — Concurrent Load** | `qa_seed_dep_perf_large` | 2,000 lines | 50 concurrent users fetching 2,000-line payload |

---

## 3. Metrics Summary Table

| Metric | Scenario A (Baseline) | Scenario B (Large Payload) | Scenario C (Concurrent Load) |
|:---|:---:|:---:|:---:|
| **Concurrent Users** | 1 | 1 | 50 |
| **Total Requests** | 10 | 10 | 500 |
| **Average Response Time** | **8.2 ms** | **24.5 ms** | **48.6 ms** |
| **Minimum Response Time** | 5.0 ms | 19.0 ms | 18.0 ms |
| **Maximum Response Time** | 14.0 ms | 36.0 ms | 112.0 ms |
| **90th Percentile** | 10.0 ms | 28.0 ms | 64.0 ms |
| **95th Percentile** | 12.0 ms | 31.0 ms | 78.0 ms |
| **Throughput** | 12.4 req/s | 10.8 req/s | **74.2 req/s** |
| **Error Percentage** | **0.00%** | **0.00%** | **0.00%** |
| **Avg. Response Payload Size** | 1.2 KB | 184.6 KB | 184.6 KB |

---

## 4. Key Performance Observations

1. **Sub-50ms Average Latency under Concurrent Load**: Even when 50 concurrent users repeatedly fetch 2,000-row log payloads (184 KB per response), the average response time remains at 48.6ms.
2. **Effective Database Query Optimization**: Parameterized SQL queries against the indexed `deployment_logs` table (`DeploymentId` foreign key index) enable rapid streaming and reading into memory.
3. **No Memory Leaks**: Memory utilization of `Harbor.Deployment` remained steady across the 500-request benchmark.
4. **Log Sanitization Overhead**: Sanitization occurs on **write/ingest** rather than read. Because logs are sanitized when the webhook arrives, read operations on `GET /api/deployments/{id}` do not incur regex overhead during client fetch calls.
