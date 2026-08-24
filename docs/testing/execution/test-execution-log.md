# Test Execution Log

This log records the execution results for the Harbor project testing cycles.

## Sprint 1 - US1 (Application Foundation)
**Date:** 2026-08-24
**Environment:** Local Development

| Test ID | User Story | Module | Test Scenario | Status | Actual Result | Related Bug ID |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-US1-001** | US1 | Frontend | Verify React frontend starts successfully. | **PASS** | The React development server started successfully. The browser opened to `http://localhost:5173` and displayed the Vite/React page with no console errors. | N/A |
| **TC-US1-002** | US1 | Backend | Verify ASP.NET Web API backend starts successfully. | **PASS** | The `dotnet run` command executed successfully. The terminal logged 'Now listening on: http://localhost:5053' without configuration errors. | N/A |
| **TC-US1-003** | US1 | Database | Verify backend can establish MySQL connectivity using ADO.NET/direct SQL. | **FAIL** | Reviewed backend configuration files (`appsettings.json` and `Program.cs`). The MySQL connection string and ADO.NET connectivity logic have not been implemented by the development team. | DEF-US1-001 |
| **TC-US1-004** | US1 | API | Verify Swagger UI is accessible and displays available endpoints. | **PASS** | Navigated to `http://localhost:5053/swagger`. The Swagger UI loaded successfully and displayed the OpenAPI schema. | N/A |
