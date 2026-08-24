# Harbor Test Strategy

## 1. Purpose
This document defines the overarching testing strategy for the Harbor SE3022 Case Study Project. It outlines the testing approach, methodologies, and principles that will be applied throughout the software development lifecycle to ensure a high-quality product.

## 2. Testing Objectives
- Validate that the application meets all specified functional and non-functional requirements.
- Identify and document defects as early as possible in the development lifecycle.
- Ensure the application is secure, performant, and reliable.
- Provide clear visibility into the quality of the application through documented execution and reporting.

## 3. Testing Scope
The testing scope encompasses all functional components (frontend and backend), integrations, API endpoints (as documented in Swagger), security measures, and overall application performance developed within the Harbor project sprints.

## 4. Testing Principles
- Testing starts early in the development lifecycle.
- Traceability is maintained from requirements to test cases.
- Both manual and automated testing approaches are utilized where appropriate.
- Defect tracking is centralized in Jira.
- Documentation must accurately reflect actual implementation without fabricated data.

## 5. Testing Levels

### Unit Testing
Focuses on individual components or functions to ensure they operate correctly in isolation. Executed primarily by developers.

### Integration Testing
Validates the interaction between different modules or services (e.g., frontend to backend, backend to database).

### API Testing
Ensures the backend REST APIs function correctly according to the Swagger/OpenAPI documentation. Includes testing for status codes, request/response validation, and error handling.

### Functional Testing
Validates that the application features work as expected according to the Jira User Stories and Acceptance Criteria.

### Security Testing
Focuses on authentication, authorization (RBAC), data protection, and vulnerability scanning.

### End-to-End (E2E) Testing
Simulates complete user journeys through the application using automated tools (Selenium).

### Performance Testing
Measures the application's responsiveness and stability under load using JMeter.

## 6. Manual Testing Strategy
Manual testing will be employed for exploratory testing, usability evaluations, and verifying complex edge cases that are not easily automated. It forms the foundation of feature validation before automation scripts are created.

## 7. Test Automation Strategy
Automation will be applied to repetitive and critical test cases to increase efficiency.
- **E2E Automation**: Selenium will be used for automating critical user journeys.
- **API Automation**: API tests may be automated using appropriate frameworks (e.g., Postman/Newman or code-based tests).

## 8. Regression Testing Strategy
Regression testing ensures that new changes do not break existing functionality. A regression suite will be maintained and executed prior to each major release or sprint completion.

## 9. Smoke Testing Strategy
Smoke tests are a minimal set of critical tests run immediately after a new deployment to verify that the core functionality (e.g., application startup, basic connectivity) is operational.

## 10. Test Data Strategy
Test data will be carefully managed. For automated testing, data should be scriptable or mockable. Production data will not be used in lower environments unless strictly anonymized.

## 11. Test Environment Strategy
Testing will traverse through a defined pipeline of environments: Local Development -> Test -> Staging -> Production. Each environment will have specific configurations and purposes. (See [03-test-environment.md](03-test-environment.md) for details).

## 12. Defect Management Strategy
All defects are logged, tracked, and managed in Jira. Defects must include clear steps to reproduce, expected/actual results, and evidence. (See [defect-log.md](defects/defect-log.md) for the project summary).

## 13. Requirements Traceability
Requirement → Jira User Story → Acceptance Criteria → Test Case → Test Execution → Defect (if applicable) → Retest → Final Result.

## 14. Test Evidence Management
Evidence such as screenshots, API responses, and log snippets must be attached to test executions in Jira and referenced in the project documentation.

## 15. Roles and Responsibilities

### BA (Business Analyst)
- Defines requirements and acceptance criteria.
- Ensures requirement traceability.

### Developer
- Writes and executes unit tests.
- Fixes reported defects.
- Supports integration testing efforts.

### QA Engineer
- Designs and writes test cases.
- Executes functional, integration, API, security, and E2E testing.
- Logs and reports defects.
- Captures test evidence.

### DevOps
- Manages and provisions test environments.
- Integrates CI/CD test execution (when implemented).
- Validates deployment processes.
- Supports monitoring and observability.

## 16. Entry Criteria
- Code is merged to the appropriate branch.
- Unit tests have passed.
- Environment is deployed and accessible.
- Test cases are documented and approved.

## 17. Exit Criteria
- All planned test cases have been executed.
- No critical or high severity defects remain open (or exceptions are formally approved).
- Test execution logs and reports are updated.

## 18. Risks and Mitigations
- **Risk**: Delay in environment availability. **Mitigation**: Utilize local environments and mocking where possible.
- **Risk**: Unclear requirements. **Mitigation**: QA and BA collaboration during sprint planning to refine acceptance criteria.
