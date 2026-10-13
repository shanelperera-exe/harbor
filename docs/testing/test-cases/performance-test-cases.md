# Performance Test Cases

## Overview
This document outlines performance test scenarios using JMeter.

### Performance Testing Scope:
- Load testing
- Stress testing
- Response-time validation
- Throughput
- Concurrent users
- Error rate
- Resource behavior

## Current Status
*Note: Do not claim JMeter performance testing has been executed if no performance test has been run.*

No performance tests have been executed for the Application Foundation (US1).

Performance tests for US-19 (Deployment Details and Logs) have been created but not yet executed.

---

## Test Case Template

- **Test Case ID:** [ID]
- **Title:** [e.g., API Load Test - Get Users]
- **Scenario:** [Describe the load scenario]
- **Target Metrics:**
  - Concurrent users: [Target]
  - Response time (95th percentile): [< Target ms]
  - Error rate: [< Target %]
- **Preconditions:** [Environment state, data volume]
- **Test Steps (JMeter):**
  1. [Configure Thread Group]
  2. [Execute Request]
- **Expected Result:** System meets or exceeds target metrics.
- **Actual Result:** `[TO BE COMPLETED]`
- **Status:** NOT EXECUTED | PASS | FAIL | BLOCKED | NOT APPLICABLE
- **Evidence:** `[TO BE COMPLETED: Link to JMeter report]`

---

## US-19 Test Cases

### US19-PERF-01: Baseline — Small Logs

- **Test Case ID:** US19-PERF-01
- **Title:** Deployment Details API — Baseline Response Time (Small Logs)
- **Scenario:** A single user requests deployment details for a deployment with a small number of log rows (~4).
- **Target Metrics:**
  - Concurrent users: 1
  - Iterations: 1
  - Error rate: < 1%
- **Preconditions:**
  - Harbor stack running (API Gateway at `localhost:5053`, all services healthy)
  - `scripts/ci/seed-deployment-data.sh` has been executed
  - Valid JWT token available for `qa_tester2`
- **Test Steps (JMeter):**
  1. Set `-Jjwt_token=<valid_jwt>` and `-l results/baseline-small-logs.jtl`
  2. Run `jmeter -n -t tests/performance/DeploymentDetailsLoadTest.jmx`
  3. Filter results for thread group `A - Baseline - Small Logs`
- **Expected Result:** HTTP 200 for all requests; response time recorded for baseline comparison.
- **Actual Result:** `[TO BE COMPLETED]`
- **Status:** NOT EXECUTED
- **Evidence:** `[TO BE COMPLETED]`

### US19-PERF-02: Large Log Payload — 2,000 Rows

- **Test Case ID:** US19-PERF-02
- **Title:** Deployment Details API — Large Log Payload Performance
- **Scenario:** A single user requests deployment details for a deployment containing 2,000 log rows. Measures the performance impact of retrieving, sanitizing, and serializing a large log set.
- **Target Metrics:**
  - Concurrent users: 1
  - Iterations: 1
  - Log rows: 2,000
  - Error rate: < 1%
- **Preconditions:**
  - Harbor stack running
  - `scripts/ci/seed-performance-data.sh` has been executed (creates `qa_seed_dep_perf_large`)
  - Valid JWT token available for `qa_tester2`
- **Test Steps (JMeter):**
  1. Set `-Jjwt_token=<valid_jwt>`
  2. Run `jmeter -n -t tests/performance/DeploymentDetailsLoadTest.jmx`
  3. Filter results for thread group `B - Large Log Payload - 2000 rows`
- **Expected Result:** HTTP 200 for all requests; response time and payload size recorded.
- **Actual Result:** `[TO BE COMPLETED]`
- **Status:** NOT EXECUTED
- **Evidence:** `[TO BE COMPLETED]`

### US19-PERF-03: Concurrent Load — 50 Users x 10 Iterations

- **Test Case ID:** US19-PERF-03
- **Title:** Deployment Details API — Concurrent Load Test
- **Scenario:** 50 concurrent users each make 10 requests to the deployment details endpoint (500 total requests) against the 2,000-log deployment.
- **Target Metrics:**
  - Concurrent users: 50
  - Iterations per user: 10
  - Total requests: 500
  - Error rate: < 1%
- **Preconditions:**
  - Harbor stack running
  - `scripts/ci/seed-performance-data.sh` has been executed
  - Valid JWT token available for `qa_tester2`
- **Test Steps (JMeter):**
  1. Set `-Jjwt_token=<valid_jwt>`
  2. Run `jmeter -n -t tests/performance/DeploymentDetailsLoadTest.jmx`
  3. Filter results for thread group `C - Concurrent Load - 50 users`
- **Expected Result:** HTTP 200 for the majority of requests; throughput and p95 response time recorded.
- **Actual Result:** `[TO BE COMPLETED]`
- **Status:** NOT EXECUTED
- **Evidence:** `[TO BE COMPLETED]`
