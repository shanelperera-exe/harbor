# Harbor Testing Documentation

## Purpose
This repository serves as the official QA and testing documentation layer for the Harbor SE3022 Case Study Project. The purpose of this documentation is to outline the testing strategy, maintain project-level test plans, and provide a version-controlled repository for test reporting, execution logs, and defect tracking.

## QA Documentation Overview
The `docs/testing/` directory is the single source of truth for the project's testing methodology and formal test reporting. While operational day-to-day tracking (such as moving tickets and logging individual execution results) is managed in Jira, this documentation provides the structured, historical, and professional project deliverables required for evaluation.

## Testing Philosophy
Harbor's testing philosophy is rooted in continuous validation and clear traceability. We aim to ensure that every requirement is backed by a corresponding test case and that testing is considered at every stage of the development lifecycle—from unit tests written by developers to End-to-End (E2E) automated tests executed by QA Engineers.

## Testing Types Used by Harbor
- Unit Testing
- Integration Testing
- API Testing
- Functional Testing
- Security Testing
- End-to-End (E2E) Testing
- Performance/Load Testing

## Tooling Relationships
- **Jira**: Used for the working backlog, writing user stories, managing acceptance criteria, tracking operational test execution, and logging defects.
- **GitHub (`docs/testing/`)**: The version-controlled project documentation and formal reporting layer.
- **Swagger / OpenAPI**: The interactive, authoritative source for API documentation.
- **Selenium**: The chosen tool for End-to-End (E2E) testing.
- **JMeter**: The chosen tool for performance and load testing.
- **Coverage Tools**: Used for measuring code coverage metrics (e.g., frontend, backend).

## Tracking and Maintenance
- **Test Cases**: The operational test cases are tracked in Jira. However, their structural documentation and templates reside in the `test-cases/` directory here.
- **Defects**: Defects are actively managed in Jira. A consolidated project-level summary is maintained in the `defects/` directory here.
- **Permanent QA Documentation**: All permanent strategies, plans, and reports are maintained in this `docs/testing/` directory in GitHub.

## Documentation Maintenance Rules
- Do NOT fabricate test results, coverage percentages, performance measurements, defect counts, pass/fail results, endpoints, or implemented functionality.
- Where evidence/results do not yet exist, use clearly marked placeholders such as `[TO BE COMPLETED]` or `[NOT YET EXECUTED]`.
- All updates must reflect the actual state of the Harbor project and its Jira backlog.

## Traceability Model
The Harbor project enforces the following traceability model to ensure all requirements are validated:
`Requirement` → `Jira User Story` → `Acceptance Criteria` → `Test Case` → `Test Execution` → `Defect (if applicable)` → `Retest` → `Final Result`

---

## Directory Index

### Core Strategy and Planning
- [Test Strategy](01-test-strategy.md)
- [Test Plan](02-test-plan.md)
- [Test Environment](03-test-environment.md)

### Test Cases
- [Functional Test Cases](test-cases/functional-test-cases.md)
- [Unit Test Cases](test-cases/unit-test-cases.md)
- [Integration Test Cases](test-cases/integration-test-cases.md)
- [API Test Cases](test-cases/api-test-cases.md)
- [Security Test Cases](test-cases/security-test-cases.md)
- [End-to-End Test Cases](test-cases/e2e-test-cases.md)
- [Performance Test Cases](test-cases/performance-test-cases.md)

### Execution and Defects
- [Test Execution Log](execution/test-execution-log.md)
- [Test Results](execution/test-results.md)
- [Regression Test Results](execution/regression-test-results.md)
- [Defect Log](defects/defect-log.md)

### Coverage
- [Requirements Coverage](coverage/requirements-coverage.md)
- [Test Case Coverage](coverage/test-case-coverage.md)
- [Code Coverage](coverage/code-coverage.md)

### Specialized Testing
- [Selenium E2E Strategy](e2e/selenium-strategy.md)
- [Selenium Results](e2e/selenium-results.md)
- [JMeter Test Plan](performance/jmeter-test-plan.md)
- [JMeter Results](performance/jmeter-results.md)
- [Security Test Report](security/security-test-report.md)

### QA Reports
- [Sprint 01 QA Report](reports/sprint-01-qa-report.md)
- [Sprint 02 QA Report](reports/sprint-02-qa-report.md)
- [Sprint 03 QA Report](reports/sprint-03-qa-report.md)
- [Sprint 04 QA Report](reports/sprint-04-qa-report.md)
- [Final QA Report](reports/final-qa-report.md)
