# Functional Test Cases

## 1. Overview
This document specifies functional test cases for the Harbor platform, covering core operational paths, boundary validations, role-based authorization, and error handling.

## 2. Test Case Structure
Each test case adheres to the following structure:
- **Test Case ID:** Unique identifier
- **Title:** Brief description of the test
- **Jira Story:** Related user story ID
- **Requirement:** Corresponding requirement being tested
- **Acceptance Criterion:** The specific criterion being validated
- **Test Type:** Functional / Smoke / Regression
- **Priority:** High / Medium / Low
- **Preconditions:** What must be true before testing
- **Expected Result:** What should happen
- **Actual Result:** Observed test execution outcome
- **Status:** PASS / FAIL / BLOCKED
- **Evidence:** Test logs or terminal trace

---

## 3. Core Foundation & Operational Test Cases

### TC-US1-001: Verify React frontend starts successfully
- **Jira Story:** US-01 - Application Foundation
- **Requirement:** Frontend application must initialize
- **Acceptance Criterion:** The React application starts and serves a default page without crashing.
- **Test Type:** Functional / Smoke
- **Priority:** High
- **Preconditions:** Node.js 20+ and npm installed. `npm install` executed.
- **Test Steps:**
  1. Navigate to `src/frontend`.
  2. Run `npm run dev`.
  3. Navigate to `http://localhost:5173`.
- **Expected Result:** React application loads successfully in the browser. Zero console errors.
- **Actual Result:** Both `harbor-web` (port 5173) and `harbor-admin` (port 5174) compile in < 300ms and serve active UI.
- **Status:** **PASS**
- **Evidence:** Vite server logs: `Local: http://localhost:5173/`

### TC-US1-002: Verify ASP.NET Web API backend starts successfully
- **Jira Story:** US-01 - Application Foundation
- **Requirement:** Backend API service must initialize
- **Acceptance Criterion:** The ASP.NET Core Web API starts and listens for requests.
- **Test Type:** Functional / Smoke
- **Priority:** High
- **Preconditions:** .NET 10 SDK installed. PostgreSQL active.
- **Test Steps:**
  1. Navigate to `src/backend/Harbor.ApiGateway`.
  2. Run `dotnet run`.
- **Expected Result:** Application starts successfully and logs listening port (`http://localhost:5000`).
- **Actual Result:** ApiGateway and microservices start cleanly, run migrations, and report healthy on `/health`.
- **Status:** **PASS**
- **Evidence:** Terminal output: `Now listening on: http://localhost:5000`

### TC-US1-005: Verify basic application foundation smoke testing
- **Jira Story:** US-01 - Application Foundation
- **Requirement:** The core application stack must be operational.
- **Acceptance Criterion:** Both frontend and backend services can run concurrently without port conflicts.
- **Test Type:** Smoke
- **Priority:** High
- **Preconditions:** Frontend and backend dependencies installed.
- **Test Steps:**
  1. Start `docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d`.
  2. Query `http://localhost:5000/health`.
  3. Browse `http://localhost:5173`.
- **Expected Result:** Gateway reverse-proxies to microservices; web client renders dashboard.
- **Actual Result:** Concurrent execution confirmed with zero port conflicts. Gateway routes `/api/auth/*` and `/api/projects/*` cleanly.
- **Status:** **PASS**
- **Evidence:** Verified via `curl -s http://localhost:5000/health` returning `{"status":"Healthy"}`
