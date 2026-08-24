# Functional Test Cases

## Overview
This document contains the functional test cases for the Harbor application, covering happy-path, negative, boundary/edge-case, validation, and error-handling scenarios.

## Test Case Structure
Each test case adheres to the following structure:
- **Test Case ID:** Unique identifier
- **Title:** Brief description of the test
- **Jira Story:** Related user story ID
- **Requirement:** Corresponding requirement being tested
- **Acceptance Criterion:** The specific criterion being validated
- **Test Type:** e.g., Functional, Smoke
- **Priority:** High, Medium, Low
- **Preconditions:** What must be true before testing
- **Test Data:** Data required for the test
- **Test Steps:** Step-by-step execution instructions
- **Expected Result:** What should happen
- **Actual Result:** What actually happened
- **Status:** NOT EXECUTED | PASS | FAIL | BLOCKED | NOT APPLICABLE
- **Evidence:** Links to screenshots, logs, etc.
- **Defect ID:** If applicable
- **Retest Status:** If applicable

---

## Foundation Test Cases (US1)

### TC-US1-001: Verify React frontend starts successfully
- **Jira Story:** US1 - Application Foundation
- **Requirement:** Frontend application must initialize
- **Acceptance Criterion:** The React application starts and serves a default page without crashing.
- **Test Type:** Functional / Smoke
- **Priority:** High
- **Preconditions:** Node.js and npm are installed. Dependencies are installed (`npm install`).
- **Test Data:** None
- **Test Steps:**
  1. Navigate to the frontend directory.
  2. Run `npm start` (or equivalent dev server command).
  3. Open a browser and navigate to the local development URL (e.g., `http://localhost:3000`).
- **Expected Result:** The React application loads successfully in the browser. No errors are displayed in the browser console.
- **Actual Result:** `[TO BE COMPLETED]`
- **Status:** NOT EXECUTED
- **Evidence:** `[TO BE COMPLETED]`
- **Defect ID:** N/A
- **Retest Status:** N/A

### TC-US1-002: Verify ASP.NET Web API backend starts successfully
- **Jira Story:** US1 - Application Foundation
- **Requirement:** Backend API service must initialize
- **Acceptance Criterion:** The ASP.NET Core Web API starts and listens for requests.
- **Test Type:** Functional / Smoke
- **Priority:** High
- **Preconditions:** .NET SDK is installed.
- **Test Data:** None
- **Test Steps:**
  1. Navigate to the backend directory.
  2. Run `dotnet run`.
  3. Observe the console output.
- **Expected Result:** The application starts successfully and logs the listening ports (e.g., `Now listening on: https://localhost:xxxx`).
- **Actual Result:** `[TO BE COMPLETED]`
- **Status:** NOT EXECUTED
- **Evidence:** `[TO BE COMPLETED]`
- **Defect ID:** N/A
- **Retest Status:** N/A

### TC-US1-005: Verify basic application foundation smoke testing
- **Jira Story:** US1 - Application Foundation
- **Requirement:** The core application stack must be operational.
- **Acceptance Criterion:** Both frontend and backend services can run concurrently without port conflicts or immediate crashes.
- **Test Type:** Smoke
- **Priority:** High
- **Preconditions:** Frontend and backend dependencies are installed.
- **Test Data:** None
- **Test Steps:**
  1. Start the backend service.
  2. Start the frontend service.
  3. Ensure both services report they are running.
- **Expected Result:** Both services start and remain running without resource or port conflict errors.
- **Actual Result:** `[TO BE COMPLETED]`
- **Status:** NOT EXECUTED
- **Evidence:** `[TO BE COMPLETED]`
- **Defect ID:** N/A
- **Retest Status:** N/A
