# Harbor API Test Cases Specification

## 1. Overview
This document specifies API test cases for the Harbor backend REST APIs and YARP Gateway.

### Testing Scope
- Ingress routing and path transformation through `Harbor.ApiGateway`.
- HTTP status codes (200, 201, 204, 400, 401, 403, 404, 429, 500).
- Request validation filters and parameter binding.
- RFC 7807 Problem Details error formatting.
- JWT Bearer token authentication and role claims (`Developer`, `Admin`).
- Internal service-to-service authentication via `X-Internal-Token`.

---

## 2. Core API Test Cases

### TC-API-001: Swagger UI Documentation Generation
- **Jira Story:** US-01 - Application Foundation
- **Requirement:** API documentation must be automatically generated and accessible.
- **Acceptance Criterion:** Swagger UI loads and correctly parses the OpenAPI specification for each microservice.
- **Test Type:** API / Integration
- **Priority:** High
- **Preconditions:** Backend running in Development mode.
- **Test Steps:**
  1. Launch backend services.
  2. Navigate to `http://localhost:5000/swagger` or per-service `/swagger/v1/swagger.json`.
- **Expected Result:** Swagger UI loads; lists all endpoints with schemas and interactive "Try it out" controls.
- **Actual Result:** OpenAPI 3.0 specification successfully rendered across all microservices with Bearer authentication definition.
- **Status:** **PASS**
- **Evidence:** HTTP 200 returned on `/swagger/v1/swagger.json`.

### TC-API-002: User Registration Endpoint Contract (`POST /api/auth/register`)
- **Jira Story:** US-02 - User Registration
- **Requirement:** Valid registration returns 201 Created and user profile; invalid inputs return 400.
- **Test Type:** API
- **Priority:** High
- **Test Steps:**
  1. Send `POST /api/auth/register` with valid JSON payload.
  2. Inspect response headers and body.
- **Expected Result:** Status 201 Created; response contains user ID, email, name, and JWT token.
- **Actual Result:** Status 201 returned; password hash omitted from response envelope.
- **Status:** **PASS**

### TC-API-003: Role-Based Authorization Guard on Admin Users (`GET /api/auth/admin/users`)
- **Jira Story:** US-04 - Role-Based Access Control
- **Requirement:** Non-admin JWT tokens must be rejected with 403 Forbidden.
- **Test Type:** API / Security
- **Priority:** High
- **Test Steps:**
  1. Generate JWT with `role: "Developer"`.
  2. Send `GET /api/auth/admin/users` with `Authorization: Bearer <token>`.
- **Expected Result:** Status 403 Forbidden.
- **Actual Result:** Middleware intercepts request; returns 403 Forbidden with Problem Details envelope.
- **Status:** **PASS**

### TC-API-004: Deployment Triggering API (`POST /api/deployments`)
- **Jira Story:** US-14 - Deployment Initiation
- **Requirement:** Dispatches deployment request to target service and GitHub Actions.
- **Test Type:** API
- **Priority:** High
- **Test Steps:**
  1. Send `POST /api/deployments` with `serviceId`, `environmentId`, `commitSha`, and `version`.
- **Expected Result:** Status 201 Created with generated `publicId` and initial status `"Running"`.
- **Actual Result:** Status 201 Created; deployment record persisted; Kafka lifecycle event emitted.
- **Status:** **PASS**

### TC-API-005: Parameterized Deployment Report Ingestion (`GET /api/reporting/deployments`)
- **Jira Story:** US-22 - Deployment Reporting
- **Requirement:** Returns filtered deployment reports based on query parameters.
- **Test Type:** API
- **Priority:** High
- **Test Steps:**
  1. Send `GET /api/reporting/deployments?status=Succeeded&environment=Production`.
- **Expected Result:** Status 200 OK with JSON array of matching deployment reports.
- **Actual Result:** Status 200 OK; response filtered correctly by status and environment in < 25ms.
- **Status:** **PASS**
