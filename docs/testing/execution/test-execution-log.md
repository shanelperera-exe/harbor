# Harbor Test Execution Log

## 1. Overview
This document serves as the formal, version-controlled project execution log capturing test runs across the Harbor platform development lifecycle.

---

## 2. Formal Execution Records

| Execution ID | Date | Tester / Runner | Jira Story | Test Suite / Target | Branch | Environment | Result | Defect ID | Retest Status |
|:---|:---:|:---|:---:|:---|:---:|:---|:---:|:---:|:---:|
| `EXEC-001` | 2026-08-15 | QA / Dev | US-01 | Microservice Foundation & Gateway Routing | `feat/us-01` | Local Docker | **Passed** | `BUG-UI-001` | Passed |
| `EXEC-002` | 2026-08-22 | QA / Automated | US-02/03 | User Registration, BCrypt & JWT Issuance | `feat/us-02-auth` | CI / Testcontainers | **Passed** | — | — |
| `EXEC-003` | 2026-09-02 | QA / Automated | US-06/07 | Project CRUD, Archival & Ownership | `feat/us-06-projects` | CI / Testcontainers | **Passed** | — | — |
| `EXEC-004` | 2026-09-10 | QA / Automated | US-09/10 | Environment Tiers & AES-256-GCM Secrets | `feat/us-10-config` | CI / Testcontainers | **Passed** | `BUG-US10-001` | Passed |
| `EXEC-005` | 2026-09-18 | QA / Selenium | US-11 | Environment Card Deployment Summary | `feat/us-11-deploy-cfg` | Staging / Chrome | **Passed** | `BUG-US11-001` | Passed |
| `EXEC-006` | 2026-09-28 | QA / Automated | US-12/14 | GitHub App Dispatch & Workflow Dispatch | `feat/us-14-dispatch` | CI / Testcontainers | **Passed** | `BUG-US14-001` | Passed |
| `EXEC-007` | 2026-10-02 | QA / Automated | US-16 | DNS Custom Domain CNAME/TXT Verification | `feat/us-16-domains` | Staging / DNS | **Passed** | `BUG-US16-001` | Passed |
| `EXEC-008` | 2026-10-08 | QA / Automated | US-17 | Kafka Event Streaming & Replay | `feat/us-17-kafka` | Local Kafka | **Passed** | — | — |
| `EXEC-009` | 2026-10-12 | QA / Automated | US-19 | Sanitized Deployment Logs & URL Extraction | `feat/us-19-logs` | CI / Testcontainers | **Passed** | `BUG-US19-001` | Passed |
| `EXEC-010` | 2026-10-14 | QA / Automated | US-21 | Notification Bell & User Isolation | `feat/us-21-notif` | Staging / Chrome | **Passed** | `BUG-UI-002` | Passed |
| `EXEC-011` | 2026-10-15 | QA / JMeter | US-20/22 | JMeter Load & Reporting Benchmarks | `main` | Local Docker | **Passed** | — | — |
| `EXEC-012` | 2026-10-16 | QA / Automated | Full | MultiReport Code Coverage & Final Regression | `code-coverage` | CI / Testcontainers | **Passed** | — | — |
| `EXEC-013` | 2026-10-17 | QA / JMeter | All Services | Full 20-Suite Performance & Stress Test Run (8,074 samples) | `main` | Local Docker | **Passed** | — | — |
