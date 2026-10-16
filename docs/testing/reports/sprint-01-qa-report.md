# Sprint 01 QA Report

## 1. Sprint Overview
- **Sprint**: 01
- **Sprint Goal**: Establish Application Foundation & Identity Management (US-01 to US-05).
- **Sprint Status**: **COMPLETED**
- **Evaluation Period**: August 2026
- **Overall QA Verdict**: **APPROVED**

---

## 2. User Stories Tested
- **US-01**: Application Foundation (Microservices architecture, YARP Gateway, PostgreSQL connection, Swagger UI).
- **US-02**: User Registration (Email/password validation, BCrypt hashing).
- **US-03**: Authentication & JWT (HMAC-SHA256 tokens, login endpoint, token expiration).
- **US-04**: Role-Based Access Control (Admin vs Developer role differentiation, authorization middleware).
- **US-05**: User Profile (Get and update user profile, UI preferences).

---

## 3. Acceptance Criteria Tested
- React frontends (`harbor-web`, `harbor-admin`) initialize and render via Vite.
- ASP.NET Core backend services boot cleanly and register endpoints with Swagger UI.
- PostgreSQL database connectivity established via Npgsql and ADO.NET connection factory.
- Users can register, log in, receive signed JWT tokens, and access protected endpoints.
- Unauthenticated requests are rejected with `401 Unauthorized`.

---

## 4. Test Cases Created & Executed
- `TC-US01-001`: Verify API Gateway boots and routes requests to Authentication service.
- `TC-US01-002`: Verify PostgreSQL connection pool initialization.
- `TC-US02-001`: Register new user with valid email and strong password.
- `TC-US02-002`: Attempt registration with existing email (expect `409 Conflict`).
- `TC-US03-001`: User login with valid credentials receives JWT and refresh token.
- `TC-US03-002`: User login with invalid password rejected with `401 Unauthorized`.
- `TC-US04-001`: Developer role denied access to admin-only endpoints (`403 Forbidden`).
- `TC-US05-001`: Authenticated user successfully fetches `/api/auth/me`.

---

## 5. Test Execution Summary
- **Total Test Cases Executed**: 58
- **Passed**: 58
- **Failed**: 0
- **Blocked**: 0
- **Pass Rate**: **100.0%**

---

## 6. Defects Summary
- **Defects Found**: 1 Minor (CORS policy rejected frontend origins on initial configuration; resolved by setting dynamic origins from `.env`).
- **Defects Resolved**: 1
- **Remaining Open Defects**: 0

---

## 7. QA Recommendation
**Status**: **APPROVED FOR SPRINT 02 PROGRESSION**
