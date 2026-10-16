# Harbor Performance Test Cases Specification

## 1. Overview
This document specifies performance and load test cases for the Harbor platform executed using Apache JMeter.

### Performance Testing Scope:
- Authentication & JWT token validation throughput.
- User registration and BCrypt password hashing overhead.
- Deployment details and log payload serialization response times (US-19).
- High-concurrency spike testing (up to 500 threads) and stress testing (20,000 requests).

---

## 2. Core Performance Test Cases

### TC-PERF-001: JWT Validation Latency & Throughput
- **Test Case ID:** `TC-PERF-001`
- **Target Endpoint:** `GET /api/Protected/developer-area`
- **Scenario:** 500 requests simulating concurrent authenticated API calls passing Bearer JWT tokens.
- **Target Metrics:**
  - Concurrent users: 10
  - Response time (95th percentile): < 20 ms
  - Error rate: 0%
- **Expected Result:** Token verified in-memory and checked against Redis blacklist in < 20ms with 0% errors.
- **Actual Result:** Average response time: **1.37 ms**; 95th percentile: **3.00 ms**; Error rate: **0.00%**; Throughput: **51.33 req/sec**.
- **Status:** **PASS**
- **Evidence:** `tests/performance/jwt-report/`

### TC-PERF-002: User Registration & BCrypt Work Factor 11
- **Test Case ID:** `TC-PERF-002`
- **Target Endpoint:** `POST /api/Auth/register`
- **Scenario:** 500 user registrations validating CPU-bound BCrypt password hashing throughput.
- **Target Metrics:**
  - Response time (Average): < 250 ms
  - Error rate: < 1%
- **Expected Result:** High-entropy salted BCrypt hashing completes reliably without server deadlock.
- **Actual Result:** Average response time: **133.84 ms**; 95th percentile: **145.95 ms**; Error rate: **0.00%**; Throughput: **45.72 req/sec**.
- **Status:** **PASS**
- **Evidence:** `tests/performance/reg-report/`

---

## 3. US-19 Deployment Details & Logs Test Cases

### US19-PERF-01: Baseline — Small Logs
- **Test Case ID:** `US19-PERF-01`
- **Title:** Deployment Details API — Baseline Response Time (Small Logs)
- **Scenario:** A single user requests deployment details for a deployment with small log payload (~4 rows).
- **Target Metrics:**
  - Concurrent users: 1
  - Error rate: < 1%
- **Expected Result:** HTTP 200 for all requests; sub-20ms response time.
- **Actual Result:** Average response time: **8.2 ms**; Minimum: **5.0 ms**; Maximum: **14.0 ms**; Error rate: **0.00%**.
- **Status:** **PASS**
- **Evidence:** `docs/testing/performance/deployment-performance-results.md`

### US19-PERF-02: Large Log Payload — 2,000 Rows
- **Test Case ID:** `US19-PERF-02`
- **Title:** Deployment Details API — Large Log Payload Performance
- **Scenario:** A single user requests deployment details for a deployment containing 2,000 log rows (~184 KB payload).
- **Target Metrics:**
  - Log rows: 2,000
  - Error rate: < 1%
- **Expected Result:** HTTP 200 for all requests; sub-50ms response time.
- **Actual Result:** Average response time: **24.5 ms**; 95th percentile: **31.0 ms**; Error rate: **0.00%**.
- **Status:** **PASS**
- **Evidence:** `docs/testing/performance/deployment-performance-results.md`

### US19-PERF-03: Concurrent Load — 50 Users x 10 Iterations
- **Test Case ID:** `US19-PERF-03`
- **Title:** Deployment Details API — Concurrent Load Test
- **Scenario:** 50 concurrent users each make 10 requests to the deployment details endpoint (500 total requests) against the 2,000-log deployment.
- **Target Metrics:**
  - Concurrent users: 50
  - Total requests: 500
  - Error rate: < 1%
- **Expected Result:** HTTP 200 for all requests; throughput > 50 req/sec; p95 < 100 ms.
- **Actual Result:** Average response time: **48.6 ms**; 95th percentile: **78.0 ms**; Throughput: **74.2 req/sec**; Error rate: **0.00%**.
- **Status:** **PASS**
- **Evidence:** `docs/testing/performance/deployment-performance-results.md`
