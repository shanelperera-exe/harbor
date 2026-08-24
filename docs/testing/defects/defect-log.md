# Defect Log

This log tracks the defects identified during the QA testing cycles.

## Open Defects

| Bug ID | User Story | Severity | Summary | Status | Date Reported | Assigned To |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DEF-US1-001** | US1 | High | Missing MySQL Database Connectivity Implementation | Open | 2026-08-24 | Dev Team |

### DEF-US1-001 Details
**Steps to Reproduce:**
1. Open the backend configuration file (`src/backend/Harbor.ApiGateway/appsettings.json`).
2. Observe the lack of a `"ConnectionStrings"` block.
3. Open `src/backend/Harbor.ApiGateway/Program.cs`.
4. Observe the lack of ADO.NET MySQL dependency injection or connection logic.

**Expected Result:** A MySQL connection string should be present, and ADO.NET connectivity should be established to satisfy US1 criteria.
**Actual Result:** No connection string or ADO.NET logic has been implemented in the codebase.
