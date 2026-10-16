# Sprint 03 QA Report

## 1. Sprint Overview
- **Sprint**: 03
- **Sprint Goal**: Implement GitHub Actions Integration, Custom Domains, and Kafka Event Streaming (US-12 to US-17).
- **Sprint Status**: **COMPLETED**
- **Evaluation Period**: September–October 2026
- **Overall QA Verdict**: **APPROVED**

---

## 2. User Stories Tested
- **US-12**: GitHub App Integration (RS256 JWT generation, temporary installation access tokens).
- **US-13**: Branch & Commit Selection (Interactive branch dropdowns and commit SHA fetching via proxies).
- **US-14**: Deployment Initiation (GitHub Actions `workflow_dispatch` with 6 mandatory inputs).
- **US-15**: Custom Domain Routing (Map custom domains to services, SSL ingress mapping).
- **US-16**: Automated DNS Verification (Query public DNS for CNAME and TXT verification tokens).
- **US-17**: Kafka Event Streaming (Publishing `DeploymentLifecycleEvent` to `deployment-events`).

---

## 3. Acceptance Criteria Tested
- GitHub App credentials broker valid installation access tokens cached for 45 minutes.
- Frontend dropdowns fetch branches and recent commits directly via backend proxy endpoints.
- Deployments trigger GitHub Actions workflows with ref and parameters (`environment`, `project`, `service`, `deployment_id`, `version`, `commit_sha`).
- Service custom domains can be added; automated DNS verification detects configured CNAME and TXT records.
- Deployment state transitions are published to Kafka `deployment-events` topic.

---

## 4. Test Execution Summary
- **Total Test Cases Executed**: 128
- **Passed**: 128
- **Failed**: 0
- **Blocked**: 0
- **Pass Rate**: **100.0%**

---

## 5. Defects Summary
- **Defects Found**: 2 (1 High, 1 Minor)
  - `BUG-US14-001` (High): Dispatch failed when repository had capital letters in repo name due to URL encoding. Resolved by normalizing repository slug in `GitHubActionsClient`.
  - `BUG-US16-001` (Minor): DNS verification timed out on slow authoritative nameservers. Resolved by setting 5s timeout on `LookupClient`.
- **Defects Resolved**: 2
- **Remaining Open Defects**: 0

---

## 6. QA Recommendation
**Status**: **APPROVED FOR SPRINT 04 PROGRESSION**
