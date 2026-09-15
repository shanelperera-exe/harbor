# Defect Log

## Overview
This document is a professional consolidated defect log for the Harbor project.

*Note: Jira remains the primary operational defect tracker. This document serves as a high-level summary and formal report for case study evaluation. No fabricated defects are listed here.*

## Defect Severity Classifications
- **Critical:** System crash, data loss, or primary function completely broken with no workaround.
- **High:** Major functionality broken, difficult workaround.
- **Medium:** Minor functionality broken, easy workaround.
- **Low:** Cosmetic issue, typo, minor UI misalignment.

## Defect Status Lifecycle
- Open
- In Progress
- Resolved
- Ready for Retest
- Closed
- Reopened
- Rejected

---

## Logged Defects

| Defect ID | Jira Issue | Related User Story | Title | Description | Severity | Priority | Environment | Steps to Reproduce | Expected Result | Actual Result | Evidence | Developer/Owner | Status | Retest Result | Resolution |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `BUG-US11-001` | `[TBC — raise in Jira]` | US-11 | Environment list does not reflect saved deployment configuration | The environments list endpoint (`GET /api/projects/{id}/environments`) omits the `DeploymentUrl` and `Provider` columns from its query, so the environment card on the Environments page always shows "Not configured yet" even after a successful save. `EnvironmentRepository.GetByProjectIdAsync()` in `Harbor.Environment` selects only `Id, ProjectId, Name, Type, CreatedAt, IsActive, DeactivatedAt` — it is missing `DeploymentUrl` and `Provider`, which `GetByIdAsync()` (used by the Configure screen) does select. The save itself is correct; `UpdateDeploymentInfoAsync` writes both columns to the DB without issue. | Medium | High | Local (Chrome, `http://localhost:5173`) | 1. Create a project and an environment. 2. Open "Configure deployment" for that environment. 3. Enter a valid Deployment URL and Provider, click "Save configuration". 4. Confirm the "Configuration saved." notice appears. 5. Click "← Environments" to return to the environments list. | The environment card shows the saved Deployment URL and Provider (e.g. "https://api.staging.harbor.example.com · AWS") instead of "Not configured yet". | The card still shows "Not configured yet" despite the configuration having saved successfully (confirmed via the Configure screen reloading the same values correctly). | Selenium test `ConfigureEnvironment_AfterSaving_ShowsDeploymentSummaryOnEnvironmentCard` in `EnvironmentConfigurationTests.cs`; manual repro screenshots attached. | `[assign to Harbor.Environment owner]` | Open | `[TBC]` | Fix verified locally by QA: adding `"DeploymentUrl", "Provider"` to the SELECT in `GetByProjectIdAsync()` and mapping columns 7/8 (same pattern as `GetByIdAsync`) resolves it — all 10 US-11 Selenium tests pass with the change applied. Fix not committed to `develop`; awaiting dev to apply on their own branch. |