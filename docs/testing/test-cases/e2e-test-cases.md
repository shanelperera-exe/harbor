# End-to-End (E2E) Test Cases Specification

## 1. Overview
This document specifies automated End-to-End (E2E) user journey test cases for the Harbor platform implemented in C# with Selenium WebDriver under `tests/Harbor.E2ETests`.

---

## 2. Core E2E User Journey Test Cases

### TC-E2E-001: User Registration with Duplicate Email
- **Jira Story:** US-02 - User Registration
- **Test Class:** `AuthTests.cs`
- **Priority:** High
- **Preconditions:** User `developer@example.com` already exists in database.
- **Browser/Environment:** Google Chrome (Headless) / Local Docker (`http://localhost:5173`)
- **Test Steps:**
  1. Navigate to `/register`.
  2. Input name, existing email `developer@example.com`, and password.
  3. Click "Create Account" button.
- **Expected Result:** Form submission blocked; inline error message displays indicating email is already in use.
- **Actual Result:** Error notification displayed: "An account with this email already exists." User remains on registration page.
- **Status:** **PASS**
- **Evidence:** Verified in `tests/Harbor.E2ETests/TestResults/e2e.trx` (Test duration: 8.40s).

### TC-E2E-002: Project Creation Form Validation
- **Jira Story:** US-06 - Project Creation
- **Test Class:** `ProjectTests.cs`
- **Priority:** High
- **Preconditions:** Authenticated user session.
- **Test Steps:**
  1. Navigate to `/projects/new`.
  2. Leave Project Name empty.
  3. Click "Create Project" button.
- **Expected Result:** Form is not submitted; browser or inline validation flags the name field as required.
- **Actual Result:** Validation feedback shown; HTTP request is not dispatched.
- **Status:** **PASS**
- **Evidence:** Verified in `e2e.trx` (Test duration: 8.80s).

### TC-E2E-003: Project Creation & Navigation to Project Details
- **Jira Story:** US-06 / US-07 - Project Management
- **Test Class:** `ProjectTests.cs`
- **Priority:** High
- **Preconditions:** Authenticated user session.
- **Test Steps:**
  1. Navigate to `/projects/new`.
  2. Enter unique Project Name "Logistics Hub" and description.
  3. Submit form.
- **Expected Result:** Redirects to Project Dashboard; "Logistics Hub" card appears in projects list.
- **Actual Result:** Project created with public ID; visible on `/projects`.
- **Status:** **PASS**
- **Evidence:** Verified in `e2e.trx` (Test duration: 13.65s).

### TC-E2E-004: Deployment Details & Log Visualization
- **Jira Story:** US-19 - Deployment Details and Logs
- **Test Class:** `DeploymentsTests.cs`
- **Priority:** High
- **Preconditions:** Seeded deployment record in database.
- **Test Steps:**
  1. Navigate to `/deployments/{id}`.
  2. Inspect status badge and logs console terminal.
- **Expected Result:** Terminal displays sanitized logs; failure reason banner absent on succeeded deployment.
- **Actual Result:** Status renders as `Succeeded` with green badge; logs display cleanly.
- **Status:** **PASS**
- **Evidence:** Verified in `e2e.trx` (Test duration: 4.83s).

### TC-E2E-005: Deployment Report Table Filtering by Status
- **Jira Story:** US-22 - Deployment Reporting
- **Test Class:** `DeploymentReportTests.cs`
- **Priority:** High
- **Preconditions:** Seeded deployments with statuses `Succeeded`, `Failed`, and `Running`.
- **Test Steps:**
  1. Navigate to `/reports/deployments`.
  2. Select status filter dropdown option "Failed".
- **Expected Result:** Table re-renders showing only rows with status "Failed".
- **Actual Result:** Table filtered instantly; non-matching rows hidden.
- **Status:** **PASS**
- **Evidence:** Verified in `e2e.trx` (Test duration: 4.01s).
