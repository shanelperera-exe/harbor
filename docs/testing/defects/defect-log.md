# Harbor Consolidated Defect Log

## 1. Overview
This document serves as the formal consolidated defect log for the Harbor platform across all development sprints.

---

## 2. Defect Severity Classifications
- **Critical**: System crash, data loss, security exposure, or primary function completely broken with no workaround.
- **High**: Major capability broken, difficult or disruptive workaround.
- **Medium**: Minor functionality broken, straightforward workaround available.
- **Low**: Cosmetic issue, minor typo, or UI styling misalignment.

## 3. Defect Status Lifecycle
`Open` → `In Progress` → `Resolved` → `Ready for Retest` → `Closed`

---

## 4. Logged & Remediated Defects

| Defect ID | User Story | Title | Severity | Status | Retest Result | Resolution Summary |
|:---|:---:|:---|:---:|:---:|:---:|:---|
| `BUG-US10-001` | US-10 | Secret decryption threw unhandled exception on database tampering | High | **Closed** | **Passed** | Wrapped AES-256-GCM decryption in `AuthenticationTagMismatchException` block; logs security event and returns sanitized error. |
| `BUG-US11-001` | US-11 | Environment list omitted `DeploymentUrl` and `Provider` columns | Medium | **Closed** | **Passed** | Updated `EnvironmentRepository.GetByProjectIdAsync()` to select `DeploymentUrl` and `Provider` columns and map to entity. |
| `BUG-US14-001` | US-14 | GitHub Actions workflow dispatch failed on mixed-case repository slugs | High | **Closed** | **Passed** | Normalized repository owner and repo names to lowercase URL slugs in `GitHubActionsClient`. |
| `BUG-US16-001` | US-16 | DNS verification timed out on slow authoritative nameservers | Medium | **Closed** | **Passed** | Added 5-second timeout and retry logic to `LookupClient` in `ServiceDomainService`. |
| `BUG-US19-001` | US-19 | Raw Bearer token strings occasionally present in CI/CD error output | Medium | **Closed** | **Passed** | Enhanced regex matching in `DeploymentLogSanitizer` to scrub all `Bearer <token>` patterns before persisting logs. |
| `BUG-US22-001` | US-22 | Deployment report query returned duplicate rows for multi-domain services | Medium | **Closed** | **Passed** | Replaced outer joins with distinct subquery constraints in `DeploymentReportRepository`. |
| `BUG-UI-001` | US-01 | CORS policy blocked developer UI port 5173 | Low | **Closed** | **Passed** | Loaded `ALLOWED_ORIGINS` dynamically from `.env` in `Harbor.ApiGateway` Program.cs. |
| `BUG-UI-002` | US-21 | Notification bell icon unread badge showed negative counts | Low | **Closed** | **Passed** | Enforced `Math.Max(0, count)` boundary clamp in notification state reducer. |

---

## 5. Summary Metrics
- **Total Defects Logged**: 8
- **Total Defects Resolved & Closed**: 8 (100%)
- **Total Open Defects**: **0**
- **Critical / High Severity Defects Remaining**: **0**