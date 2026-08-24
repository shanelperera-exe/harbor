# Security Test Cases

## Overview
This document covers the security testing scenarios for the Harbor application.

### Security Testing Areas:
- Authentication
- Authorization
- RBAC (Role-Based Access Control)
- Unauthorized access
- Input validation
- SQL injection checks
- Sensitive data exposure
- Session/token handling
- API security
- Dependency/security scanning
- Security headers (where applicable)

## Status Designations
- **PLANNED**: Test case is defined but not yet ready for execution (e.g., feature not implemented).
- **EXECUTED**: Test has been run.
- **PASSED**: Test passed security criteria.
- **FAILED**: Test failed security criteria (vulnerability found).
- **NOT APPLICABLE**: Security measure does not apply to the current context.

---

## Test Cases

### TC-SEC-001: Authentication Implementation
- **Area:** Authentication
- **Test Steps:** Verify that a user cannot access protected resources without valid credentials.
- **Status:** NOT APPLICABLE (Authentication not yet implemented in US1).

### TC-SEC-002: SQL Injection Prevention
- **Area:** SQL Injection checks
- **Test Steps:** Attempt to pass standard SQL injection payloads (e.g., `' OR '1'='1`) into input fields and API parameters.
- **Expected Result:** The input is sanitized/parameterized; the application does not execute the injected SQL and returns a safe error or handles the input securely.
- **Status:** PLANNED
