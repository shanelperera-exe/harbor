# API Test Cases

## Overview
This document details the tests used to validate the Harbor backend REST APIs. Swagger/OpenAPI is the authoritative interactive API reference for the project.

### API Testing Scope
- Endpoint validation
- HTTP method validation (GET, POST, PUT, DELETE)
- Request validation (Headers, Body, Parameters)
- Response validation (Payload structure, content)
- Status code validation (200, 201, 400, 401, 403, 404, 500)
- Error handling
- Input validation
- Authentication (When implemented)
- Authorization (When implemented)
- API security
- Database/API integration

*Note: Do not invent endpoints. Reference only those that exist in the current implementation.*

---

## Foundation Test Cases (US1)

### TC-US1-004: Verify Swagger UI is accessible and displays available API endpoints
- **Jira Story:** US1 - Application Foundation
- **Requirement:** API documentation must be automatically generated and accessible.
- **Acceptance Criterion:** The Swagger UI loads and correctly parses the OpenAPI specification for the backend API.
- **Test Type:** API / Integration
- **Priority:** High
- **Preconditions:** The ASP.NET backend is running (typically in Development mode).
- **Test Data:** None
- **Test Steps:**
  1. Start the ASP.NET backend application.
  2. Open a browser and navigate to the Swagger URL (e.g., `https://localhost:xxxx/swagger`).
- **Expected Result:** The Swagger UI dashboard is displayed. If any default endpoints exist (e.g., a WeatherForecast controller), they are listed and can be interacted with.
- **Actual Result:** `[TO BE COMPLETED]`
- **Status:** NOT EXECUTED
- **Evidence:** `[TO BE COMPLETED]`
- **Defect ID:** N/A
- **Retest Status:** N/A
