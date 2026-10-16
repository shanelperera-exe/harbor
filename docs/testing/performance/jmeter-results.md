# JMeter Performance Test Results

## 1. Overview
This document records the measured performance, throughput, and stress benchmarks for the Harbor platform executed using Apache JMeter.

All results below represent actual measurements captured from the test runs stored under `tests/performance/`.

---

## 2. Test Execution Profiles

| Profile Name | Target Capability | Test Plan File | JTL Results File | Report Directory |
|:---|:---|:---|:---|:---|
| **JWT Validation Baseline** | Token verification latency (`/api/Protected/developer-area`) | `AuthJWTValidationTest.jmx` | `jwt-results.jtl` | `jwt-report/` |
| **User Registration / BCrypt** | User creation with password hashing (`/api/Auth/register`) | `AuthRegistrationTest.jmx` | `reg-results.jtl` | `reg-report/` |
| **Spike Testing** | High-velocity traffic surge (up to 500 threads) | `AuthSpikeTest.jmx` | `spike-results.jtl` | `spike-report/` |
| **Stress Testing** | Sustained extreme load (20,000 total requests) | `AuthStressTest.jmx` | `stress-results.jtl` | `jmeter-stress-report/` |

---

## 3. Detailed Metrics Summary

### 3.1 Test Profile 1: JWT Validation Baseline (500 Samples)
Simulates concurrent authenticated API calls passing Bearer JWT tokens through the reverse proxy to measure token validation overhead and sub-millisecond Redis blacklist verification.

| Metric | Measured Value | Target SLA | Verdict |
|:---|:---:|:---:|:---:|
| **Total Requests (#Samples)** | **500** | — | Complete |
| **Failed Requests** | **0** | 0 | **PASSED** |
| **Error Percentage** | **0.00%** | < 1.0% | **PASSED** |
| **Average Response Time** | **1.37 ms** | < 20 ms | **EXCELLENT** |
| **Median Response Time** | **1.00 ms** | < 15 ms | **EXCELLENT** |
| **Minimum Response Time** | **0.00 ms** | — | — |
| **Maximum Response Time** | **17.00 ms** | < 50 ms | **EXCELLENT** |
| **90th Percentile** | **2.00 ms** | < 25 ms | **EXCELLENT** |
| **95th Percentile** | **3.00 ms** | < 35 ms | **EXCELLENT** |
| **99th Percentile** | **4.00 ms** | < 50 ms | **EXCELLENT** |
| **Throughput** | **51.33 req/sec** | — | Target Met |
| **Apdex Score (T=500ms, F=1500ms)** | **1.000** | ≥ 0.95 | **PERFECT** |

---

### 3.2 Test Profile 2: User Registration & BCrypt Hashing (500 Samples)
Measures the CPU-bound password hashing pipeline (BCrypt with work factor 11) and database insertion throughput.

| Metric | Measured Value | Target SLA | Verdict |
|:---|:---:|:---:|:---:|
| **Total Requests (#Samples)** | **500** | — | Complete |
| **Failed Requests** | **0** | 0 | **PASSED** |
| **Error Percentage** | **0.00%** | < 1.0% | **PASSED** |
| **Average Response Time** | **133.84 ms** | < 250 ms | **PASSED** |
| **Median Response Time** | **134.00 ms** | < 200 ms | **PASSED** |
| **Minimum Response Time** | **108.00 ms** | — | — |
| **Maximum Response Time** | **168.00 ms** | < 350 ms | **PASSED** |
| **90th Percentile** | **141.90 ms** | < 250 ms | **PASSED** |
| **95th Percentile** | **145.95 ms** | < 300 ms | **PASSED** |
| **99th Percentile** | **161.99 ms** | < 350 ms | **PASSED** |
| **Throughput** | **45.72 req/sec** | — | Target Met |
| **Apdex Score (T=500ms, F=1500ms)** | **1.000** | ≥ 0.95 | **PERFECT** |

---

### 3.3 Test Profile 3: Spike Testing (2,500 Samples, 500 Peak Threads)
Injects a sudden traffic surge ramping from 1 to 500 concurrent threads within 5 seconds to test gateway thread pool and connection pool elasticity.

| Metric | Measured Value | Evaluation Notes |
|:---|:---:|:---|
| **Total Requests** | **2,500** | Completed |
| **Failed Requests** | **8** | Temporary socket timeouts at thread peak |
| **Error Percentage** | **0.32%** | Well within acceptable 1% threshold under 500x spike |
| **Average Response Time** | **4,252.21 ms** | High latency during concurrent thread contention |
| **Median Response Time** | **3,911.00 ms** | Normal queue draining behavior |
| **90th Percentile** | **6,784.80 ms** | Handled without system crash or container restarts |
| **Throughput** | **101.88 req/sec** | High saturation throughput |

---

### 3.4 Test Profile 4: Extreme Stress Testing (20,000 Samples)
Sustained bombardment of 20,000 requests over extended duration to find the maximum saturation point.

| Metric | Measured Value | Evaluation Notes |
|:---|:---:|:---|
| **Total Requests** | **20,000** | Complete dataset processed |
| **Failed Requests** | **644** | Rate limiter and connection exhaustion triggers |
| **Error Percentage** | **3.22%** | System remained stable; zero database or pod crashes |
| **Throughput** | **105.17 req/sec** | Maximum sustained saturation point on local setup |

---

## 4. Key Performance Observations
1. **Decentralized JWT Validation is Extremely Fast**: Token validation at ~1.37ms average verifies that validating JWTs in-memory without inter-service HTTP roundtrips gives near-native performance.
2. **BCrypt Work Factor 11 is Well Balanced**: Average response time of 133ms provides strong resistance against GPU offline cracking while remaining snappy for end users.
3. **Database Connection Pooling Stability**: Under sustained loads up to 105 req/sec, the ADO.NET connection pool successfully reused connections with minimal wait times.
