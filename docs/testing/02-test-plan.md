# Harbor Project Test Plan

## Purpose
This document outlines the specific test plan for the Harbor project. It serves as the blueprint for testing activities, detailing the scope, resources, schedule, and processes required to validate the application.

## Scope
The testing scope is defined by the user stories and technical tasks prioritized in the Jira backlog for the active sprints. It covers both frontend (React) and backend (ASP.NET Web API) components, as well as database integrations (MySQL).

## Features Under Test
*Note: This list is derived from the current Harbor Jira backlog.*
- Application Foundation Configuration (US1)
  - React frontend startup
  - ASP.NET Web API backend startup
  - MySQL database connectivity
  - Swagger UI accessibility
- `[TO BE COMPLETED: Update as more features are added to the backlog]`

## Features Not Yet In Scope
- `[TO BE COMPLETED: Update based on backlog prioritization]`

## Test Levels
- Unit Testing
- Integration Testing
- API Testing
- Functional Testing
- Security Testing
- End-to-End Testing
- Performance Testing

## Test Types
- Smoke Testing
- Regression Testing
- Exploratory Testing
- Automated Testing

## Test Environments
Refer to [03-test-environment.md](03-test-environment.md) for detailed environment definitions.
- Local Development
- Test `[NOT YET IMPLEMENTED]`
- Staging `[NOT YET IMPLEMENTED]`
- Production `[NOT YET IMPLEMENTED]`

## Test Data
Test data will be generated utilizing scripts or defined manually for specific test cases. Placeholder data will be used where appropriate until standard data generation tools are in place.

## Tools
- **Issue Tracking & Test Management**: Jira
- **Documentation**: GitHub (Markdown)
- **API Documentation & Testing**: Swagger/OpenAPI, Postman (optional)
- **E2E Automation**: Selenium (when implemented)
- **Performance Testing**: JMeter (when implemented)
- **Code Coverage**: `[TO BE COMPLETED]`

## Roles
- **BA**: Requirements definition.
- **Developer**: Unit testing, defect remediation.
- **QA Engineer**: Test case creation, execution, reporting.
- **DevOps**: Environment management.

## Test Schedule
- **Sprint 1**: Foundation testing, initial test planning.
- **Sprint 2**: `[TO BE COMPLETED]`
- **Sprint 3**: `[TO BE COMPLETED]`
- **Sprint 4**: `[TO BE COMPLETED]`

## Test Execution Workflow
1. Identify User Story in Jira.
2. Draft Test Cases based on Acceptance Criteria.
3. Review and approve Test Cases.
4. Execute Test Cases (Manual or Automated).
5. Log results (Pass/Fail/Blocked) with evidence.

## Defect Workflow
1. Identify defect during execution.
2. Log defect in Jira with steps to reproduce and evidence.
3. Developer assigns and resolves the defect.
4. Defect moves to 'Ready for Retest'.

## Retesting Workflow
1. QA Engineer verifies the defect fix against the original steps.
2. If fixed, mark Defect as Closed and update Test Case execution to Pass.
3. If not fixed, mark Defect as Reopened.

## Regression Workflow
1. Identify regression suite based on impacted areas.
2. Execute regression suite prior to release.
3. Log any regression defects found.

## Entry Criteria
- Features are code-complete.
- Unit tests are passing.
- Test environment is available.

## Exit Criteria
- 100% of planned test cases executed.
- 0 Critical/High defects open.
- Documentation updated.

## Test Deliverables
- Test Strategy
- Test Plan
- Documented Test Cases
- Execution Logs
- Defect Reports
- Sprint QA Reports

## Risks
- Lack of test data hindering testing of edge cases.
- Dependencies on external systems (if any) delaying integration testing.
