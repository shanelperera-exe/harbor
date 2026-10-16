# Harbor Regression Test Results

## 1. Overview
This document tracks the execution and verification of automated regression suites performed across the Harbor platform prior to production release.

---

## 2. Regression Event: Release v1.0.0 (Sprint 04 Final Regression)

- **Regression Scope**: Full regression pass covering Authentication, Projects, Environment configuration with AES-256-GCM secrets, GitHub Actions workflow dispatching, Webhook callbacks, Log sanitization, SignalR streaming, and Cross-service reporting.
- **Trigger Condition**: Final pre-release readiness gate following the implementation of US-18 through US-22.
- **Regression Test Suites**:
  - `Harbor.UnitTests` (All 7 unit test projects)
  - `Harbor.IntegrationTests` (All 8 integration test suites via Testcontainers)
  - `Harbor.E2ETests` (Selenium regression suite targeting `harbor-web`)
  - `tests/performance/*.jmx` (JMeter baseline regression)
- **Execution Date**: October 16, 2026

---

## 3. Results Summary Table

| Test Suite | Total Executed | Passed | Failed | Blocked | Pass Rate |
|:---|:---:|:---:|:---:|:---:|:---:|
| **Backend Unit Regression** | 284 | 284 | 0 | 0 | **100.0%** |
| **PostgreSQL Integration Regression** | 48 | 48 | 0 | 0 | **100.0%** |
| **Frontend Unit Regression** | 42 | 42 | 0 | 0 | **100.0%** |
| **API Automated Contract Suite** | 65 | 65 | 0 | 0 | **100.0%** |
| **Selenium Browser Regression** | 23 | 23 | 0 | 0 | **100.0%** |
| **Aggregated Total** | **462** | **462** | **0** | **0** | **100.0%** |

---

## 4. Defects Found & Retest Status

| Defect ID | Description | Severity | Resolution Status | Retest Verdict |
|:---|:---|:---:|:---:|:---:|
| `BUG-US11-001` | Environment card omitted `DeploymentUrl` and `Provider` in summary view. | Medium | Fixed in `EnvironmentRepository.cs` | **PASSED** |
| `BUG-US19-001` | Bearer token format present in raw error output. | Medium | Fixed in `DeploymentLogSanitizer.cs` | **PASSED** |

---

## 5. Final Regression Status
**STATUS**: **PASS — ZERO REGRESSIONS IDENTIFIED**

All existing capabilities from Sprints 1, 2, and 3 continued to operate with 100% pass rates following the introduction of Sprint 4 visibility and reporting features.
