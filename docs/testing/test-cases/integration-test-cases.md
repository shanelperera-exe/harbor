# Integration Test Cases

## Overview
This document covers tests that validate the interaction between different components of the Harbor application.

### Integration Areas Covered:
- Frontend/backend integration
- Backend/database integration
- Service-to-service integration
- API/database integration
- Authentication integration (when implemented)
- External service integrations (when implemented)

---

## Foundation Test Cases (US1)

### TC-US1-003: Verify backend can establish MySQL connectivity
- **Jira Story:** US1 - Application Foundation
- **Requirement:** The backend must connect to the MySQL database.
- **Acceptance Criterion:** The ASP.NET application successfully establishes a connection to the MySQL database using the approved ADO.NET/direct SQL approach.
- **Test Type:** Integration
- **Priority:** High
- **Preconditions:**
  - Backend application is configured with a valid MySQL connection string.
  - A local or accessible MySQL server is running.
- **Test Data:** Valid database connection string credentials.
- **Test Steps:**
  1. Start the MySQL database service.
  2. Start the ASP.NET backend application.
  3. Trigger an action (or observe startup logs) that attempts a database connection.
- **Expected Result:** The connection is successful, and no database connection errors or timeouts are logged.
- **Actual Result:** `[TO BE COMPLETED]`
- **Status:** NOT EXECUTED
- **Evidence:** `[TO BE COMPLETED]`
- **Defect ID:** N/A
- **Retest Status:** N/A
