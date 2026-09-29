# HARBOR MVP

## Complete A–Z Project Context & AI Coding Agent Reference

> **Document purpose:** This document is the master contextual reference for AI coding agents, developers, QA engineers, business analysts, and other contributors working on the Harbor MVP.
>
> **Important:** The existing repository, approved backlog, user stories, acceptance criteria, and established technical decisions take precedence over assumptions in this document where they conflict.
>
> **Primary principle:** Harbor is a **Deployment Management and Visibility Platform**. GitHub/GitHub Actions remains responsible for source control and CI/CD execution. Harbor provides the centralized interface for managing, initiating, tracking, observing, and reporting deployments.

---

# 1. EXECUTIVE SUMMARY

Harbor is a web-based DevOps deployment management platform.

It provides development teams with a centralized place to manage applications/projects, deployment environments, deployments, deployment status, deployment history, deployment logs, and deployment-related reports.

The fundamental problem Harbor addresses is that deployment information is often distributed across:

* Git repositories
* GitHub repositories
* GitHub Actions
* CI/CD workflow pages
* workflow logs
* deployment environments
* deployment history
* different documentation and tools

Harbor brings the important deployment information into one coherent interface.

Instead of requiring a developer or DevOps user to manually navigate multiple GitHub repositories and GitHub Actions workflows, Harbor provides a centralized workflow:

```text
User
  |
  v
Harbor
  |
  +--> Projects / Applications
  |
  +--> Environments
  |
  +--> Deployment Configuration
  |
  +--> Deployment Requests
  |
  +--> Deployment Status
  |
  +--> Deployment History
  |
  +--> Deployment Logs
  |
  +--> Deployment Reports
  |
  v
GitHub
  |
  v
GitHub Actions
  |
  v
Actual Application Deployment
```

Harbor does **not** attempt to replace GitHub, GitHub Actions, Kubernetes, Docker, cloud providers, Terraform, or other infrastructure platforms.

The MVP is intentionally focused.

---

# 2. PRODUCT NAME

## Harbor

Harbor represents a controlled and reliable place where applications and deployments can be managed.

The product is aimed primarily at:

* software development teams
* DevOps-oriented teams
* QA teams
* technical project teams
* developers who need deployment visibility
* users responsible for managing application environments

---

# 3. ONE-SENTENCE PRODUCT DEFINITION

> **Harbor is a centralized web platform for managing and monitoring application deployments across environments, using GitHub and GitHub Actions as the underlying source-control and CI/CD infrastructure.**

---

# 4. THE CORE PRODUCT IDEA

The simplest way to understand Harbor is:

```text
Harbor = Deployment Management + Deployment Visibility
```

Harbor provides:

```text
Authentication
       +
Authorization
       +
Projects
       +
Environments
       +
Deployments
       +
Deployment Status
       +
Deployment History
       +
Deployment Logs
       +
Deployment Reports
       +
GitHub Integration
       +
GitHub Actions Integration
       +
Dashboard
```

while GitHub/GitHub Actions provides:

```text
Source Code
       +
Repository
       +
Workflow
       +
Build
       +
Test
       +
Deployment Execution
       +
Workflow Execution Logs
```

---

# 5. THE PROBLEM

Modern software projects frequently use GitHub Actions or another CI/CD system to build and deploy applications.

However, the deployment process can become difficult to understand when information is scattered.

A developer may need to:

1. Find the correct repository.
2. Open GitHub Actions.
3. Find the appropriate workflow.
4. Find the correct workflow run.
5. Determine which branch/version was deployed.
6. Determine the target environment.
7. Check whether the deployment succeeded.
8. Open workflow logs.
9. Search previous workflow runs.
10. Determine who triggered the deployment.
11. Manually interpret deployment history.

This creates unnecessary complexity.

Harbor provides a centralized deployment-oriented interface.

Instead of:

```text
GitHub Repository
       |
       +--> GitHub Actions
       |
       +--> Workflow
       |
       +--> Run
       |
       +--> Logs
       |
       +--> Deployment information
```

the user can interact primarily with:

```text
Harbor
   |
   +--> Project
   |
   +--> Environment
   |
   +--> Deployment
   |
   +--> Status
   |
   +--> Logs
   |
   +--> History
   |
   +--> Reports
```

---

# 6. PRODUCT GOALS

The Harbor MVP should achieve the following goals.

## 6.1 Centralize deployment information

Users should be able to see important deployment information in one place.

## 6.2 Simplify deployment management

Users should not need to manually interact with GitHub Actions for every deployment-related task.

## 6.3 Provide deployment visibility

Users should clearly understand:

* what is deployed
* where it is deployed
* which version is deployed
* who deployed it
* when it was deployed
* whether it succeeded
* whether it failed
* what happened during execution

## 6.4 Provide deployment history

Past deployment information should remain accessible.

## 6.5 Provide deployment troubleshooting information

Users should be able to inspect relevant logs and deployment details.

## 6.6 Enforce access control

Users should only perform operations allowed by their role.

## 6.7 Integrate with existing DevOps tooling

Harbor should work with GitHub and GitHub Actions rather than unnecessarily replacing them.

---

# 7. NON-GOALS

Harbor MVP is NOT intended to become:

* a GitHub replacement
* a source-code hosting platform
* a Git client
* a code editor
* a CI/CD engine
* a GitHub Actions replacement
* a Kubernetes management platform
* a Docker registry
* a cloud infrastructure platform
* a Terraform platform
* a monitoring platform
* a full observability platform
* an incident management platform
* a project-management platform
* a task-management platform
* a Jira replacement
* a Slack replacement
* a billing platform
* a general enterprise management system

These boundaries are important.

---

# 8. PRIMARY USERS

Harbor is intended for users involved in the software delivery lifecycle.

Conceptually, the major user groups include:

## 8.1 Developers

Developers need to:

* see applications
* see environments
* initiate permitted deployments
* monitor deployment status
* inspect deployment history
* inspect deployment logs

## 8.2 QA/Test Users

QA users need to:

* understand which version is deployed
* identify the current QA environment state
* inspect deployment results
* inspect deployment history
* verify deployment-related information

## 8.3 DevOps/Technical Users

Technical users need to:

* manage deployment-related configuration
* monitor deployments
* inspect failures
* view deployment history
* manage projects/environments where authorized

## 8.4 Administrators

Administrative users may manage:

* users
* roles
* project access
* environments
* system-level configuration

The exact roles and permissions must follow the approved project backlog and repository implementation.

---

# 9. USER ROLES VS DEVELOPMENT TEAM ROLES

Do not confuse:

### Product/application roles

These are roles inside Harbor, such as:

* Administrator
* Developer
* QA
* other approved application roles

with:

### Software-development team responsibilities

The project team may separately have:

* Business Analyst
* Developer
* QA Engineer
* Project/Team Lead
* DevOps responsibility
* other academic/project roles

These are different concepts.

---

# 10. HIGH-LEVEL USER JOURNEY

A normal Harbor workflow is:

```text
Login
  |
  v
Dashboard
  |
  v
Select Project
  |
  v
View Environments
  |
  v
Select Environment
  |
  v
View Deployment State
  |
  +--> View Current Deployment
  |
  +--> View History
  |
  +--> View Logs
  |
  +--> Trigger Deployment
            |
            v
      GitHub Actions
            |
            v
      Deployment Executes
            |
            v
      Harbor Gets Status
            |
            v
      Harbor Displays Result
```

---

# 11. CORE DOMAIN CONCEPTS

Harbor revolves around several important domain objects.

The most important are:

```text
User
Project
Environment
Deployment
Deployment Log
Deployment Report
```

Relationships:

```text
User
 |
 +------------------+
                    |
                    v
                 Project
                    |
          +---------+---------+
          |                   |
          v                   v
    Environment          Deployment
                              |
                    +---------+---------+
                    |                   |
                    v                   v
              Deployment Log      Deployment Report
```

---

# 12. USER

A User represents a person who can access Harbor.

A user has an identity and a role.

Conceptually:

```text
User
- id
- name
- email
- authentication information
- role
- createdAt
- updatedAt
```

The exact schema depends on the existing implementation.

A user must not be able to access protected functionality without authentication.

---

# 13. PROJECT / APPLICATION & SERVICES

A Project represents an application or system managed by Harbor.

Each Project can contain one or more **Services** (e.g., Web Service, Background Worker, Static Site), allowing teams to define granular service types, link specific GitHub repositories, and manage service configurations.

Conceptually:

```text
Project
- id
- name
- description
- createdBy
- createdAt
- updatedAt
- Services[]
  - id
  - projectId
  - serviceName
  - serviceType (e.g., Web Service, Worker, Static Site)
  - repository (owner/name)
  - defaultBranch
  - createdAt
```

A project and its underlying services serve as the parent context for:

* environments
* deployment definitions & target services
* deployment history
* reporting and status metrics

---

# 14. ENVIRONMENT

An Environment represents a target in which an application can be deployed.

Typical environments may include:

```text
Development
QA
Production
```

The exact environment names are configurable according to project requirements.

Conceptually:

```text
Environment
- id
- projectId
- name
- description
- configuration
- createdAt
- updatedAt
```

An environment belongs to a project.

A deployment should not target an unrelated environment.

---

# 15. DEPLOYMENT

A Deployment represents an attempt to deploy a project/service/version to an environment.

This is one of Harbor's most important domain objects. With the US-13 Select Branch/Commit feature, users can interactively select target branches and specific commit SHA hashes fetched directly via GitHub integration proxies when triggering a deployment.

Conceptually:

```text
Deployment
- id
- projectId
- serviceId
- environmentId
- version
- branch (selected ref/branch name)
- commitHash (selected commit SHA)
- status
- triggeredBy
- workflow/run identifier
- startedAt
- completedAt
- createdAt
```

A deployment answers:

> What was deployed (which service, branch, and commit SHA), where, by whom, when, and what happened?

---

# 16. DEPLOYMENT STATUS

The deployment status represents the state of a deployment.

The MVP should support at least:

```text
Pending
Running
Successful
Failed
```

Additional internal states may be required by implementation.

The important requirement is that Harbor must accurately distinguish between:

```text
Deployment requested
```

and:

```text
Deployment successfully completed
```

Triggering a GitHub Actions workflow does not automatically mean the deployment succeeded.

---

# 17. DEPLOYMENT LOGS

Deployment logs provide execution information relevant to a deployment.

They may originate from GitHub Actions.

The Harbor interface should make relevant logs easier to inspect.

Logs should:

* be readable
* be associated with a deployment
* support troubleshooting
* avoid exposing secrets

Never intentionally expose:

* passwords
* API tokens
* authentication secrets
* private credentials
* unnecessary sensitive information

---

# 18. DEPLOYMENT HISTORY

Harbor maintains deployment history.

The user should be able to understand previous deployment activity.

A history entry should answer:

```text
Project:
Environment:
Version:
Branch:
Triggered by:
Started:
Completed:
Status:
Workflow:
```

Deployment history should persist after deployment completion.

---

# 19. DEPLOYMENT REPORTS

Harbor provides deployment-focused reporting.

Reports should help users understand deployment activity.

Examples:

* number of deployments
* successful deployments
* failed deployments
* running deployments
* deployment activity over a period
* deployment activity by environment
* recent deployment activity

The reporting system should remain focused.

Harbor MVP is not intended to become a general-purpose business intelligence platform.

---

# 20. DASHBOARD

The dashboard is the high-level overview of Harbor.

It should provide quick visibility into the system.

Potential dashboard information includes:

```text
Projects
Environments
Recent Deployments
Successful Deployments
Failed Deployments
Running Deployments
Deployment Activity
```

The dashboard should prioritize useful information over visual decoration.

---

# 21. AUTHENTICATION

Harbor requires authentication.

Authentication determines who the user is. Harbor supports multiple authentication methods:
* **Local Password Authentication** (email and BCrypt-hashed password)
* **Google OAuth 2.0**
* **GitHub OAuth 2.0**

Typical flow:

```text
User
 |
 v
Login (Local Credentials OR External Provider: Google / GitHub)
 |
 v
Authentication Service (Harbor.Authentication)
 |
 +--> External OAuth Provider (Google / GitHub) Callback & Token Exchange
 |      |
 |      v
 |   Map External Identity / Provision User
 |
 +--> Valid Credentials / Valid OAuth Response
 |      |
 |      v
 |   Authenticated Session (JWT Token Issued)
 |
 +--> Invalid Credentials / Unconfigured OAuth Scheme
        |
        v
    Authentication Error (400/401/403)
```

### Authentication Method Management & Disconnection Options

Users can manage their connected authentication methods under Account Settings:
* **Link Additional Methods**: Users authenticated with local credentials can link Google or GitHub OAuth, and users authenticated via OAuth can set a local password or link additional OAuth providers.
* **Unlink / Disconnect Methods**: Users can disconnect external login methods or delete local password credentials (`DELETE /api/auth/me/auth-methods/{provider}`).
* **Security Safeguard**: The system strictly enforces a safeguard preventing users from unlinking their last remaining login method to ensure accounts are never locked out.

Protected resources must require authentication.

---

# 22. AUTHORIZATION

Authentication and authorization are separate.

Authentication:

> Who are you?

Authorization:

> What are you allowed to do?

Harbor must enforce authorization.

Example:

```text
Authenticated User
       |
       v
Check Role
       |
       v
Check Permission
       |
       +--> Allowed -> Perform Operation
       |
       +--> Denied -> 403
```

Frontend restrictions are useful for UX but are NOT a security boundary.

Backend authorization is mandatory.

---

# 23. RBAC

Harbor uses Role-Based Access Control.

The conceptual structure is:

```text
Role
  |
  v
Permissions
  |
  v
Operations
```

Examples of protected operations may include:

```text
View Project
Create Project
Update Project
Delete Project
View Environment
Manage Environment
Trigger Deployment
View Deployment
View Logs
View Reports
Manage Users
```

The exact role-permission matrix must follow the approved backlog.

---

# 24. FRONTEND

The frontend is the user's primary interface to Harbor.

The frontend is responsible for:

* displaying information
* accepting user input
* navigation
* forms
* dashboards
* status visualization
* deployment controls
* deployment history
* logs
* reports
* user-friendly error messages
* loading states
* empty states
* responsive UI

The frontend communicates with the backend.

The frontend should not contain privileged secrets.

---

# 25. BACKEND

The backend is responsible for business logic and security.

It should handle:

* authentication
* authorization
* users
* roles
* projects
* environments
* deployments
* GitHub integration
* GitHub Actions integration
* deployment status
* deployment history
* logs
* reports
* validation
* persistence
* error handling

The backend is the trusted application layer.

---

# 26. DATABASE

Harbor requires persistent storage for application data.

At a conceptual level:

```text
Users
Projects
Environments
Deployments
Deployment Logs
Reports / Report Data
```

Relationships must be enforced appropriately.

For example:

```text
Project
  |
  +---- Environment
  |
  +---- Deployment
```

and:

```text
Deployment
  |
  +---- Deployment Log
```

Database implementation must follow the existing repository's chosen technology.

Do not introduce a second database technology unnecessarily.

---

# 27. PROJECT RELATIONSHIPS

A project can have multiple environments.

Example:

```text
Harbor Web Application
 |
 +---- Development
 |
 +---- QA
 |
 +---- Production
```

Each environment can have multiple deployments:

```text
QA
 |
 +---- Deployment #1
 +---- Deployment #2
 +---- Deployment #3
 +---- Deployment #4
```

---

# 28. DEPLOYMENT RELATIONSHIPS

A deployment belongs to:

* one project
* one environment
* one initiating user, where applicable

and is associated with:

* a version/ref/branch
* a GitHub Actions workflow/run
* a status
* relevant logs

---

# 29. GITHUB & GITHUB API PROXY INTEGRATION

GitHub is Harbor's primary source-control and CI/CD integration provider.

Harbor provides a dedicated **GitHub Integration API Proxy** implemented inside `Harbor.Project` (`GitHubIntegrationController` + `GitHubService`):

* **Inter-Service Token Fetching**: When an authenticated user requests GitHub data, `Harbor.Project` uses `TokenService` to communicate internally with `Harbor.Authentication` (`/api/internal/users/{userId}/tokens/github`) to retrieve the user's stored GitHub OAuth access token.
* **Repository Proxy**: `GET /api/projects/githubintegration/repositories` fetches the list of repositories accessible to the user's connected GitHub account.
* **Branches Proxy**: `GET /api/projects/githubintegration/branches?owner={owner}&repo={repo}` retrieves active branches for a repository.
* **Commits Proxy**: `GET /api/projects/githubintegration/commits?owner={owner}&repo={repo}&branch={branch}` fetches recent commit history (message, SHA, author, date) for a specific branch.

These proxy endpoints are used directly by the frontend during **Service Creation** and when **Triggering Deployments** (US-13 Select Branch/Commit feature).

---

# 30. GITHUB ACTIONS

GitHub Actions is the underlying workflow execution system.

The architecture should conceptually be:

```text
Harbor
  |
  | API interaction
  v
GitHub
  |
  v
GitHub Actions
  |
  +--> Build
  |
  +--> Test
  |
  +--> Deploy
  |
  +--> Produce execution result
```

Harbor should not recreate GitHub Actions.

---

# 31. DEPLOYMENT ARCHITECTURE

The deployment lifecycle is:

```text
1. User selects Project

2. User selects Environment

3. User selects Branch/Version

4. Harbor validates request

5. Harbor checks authorization

6. Harbor creates/records deployment request

7. Harbor triggers appropriate GitHub Actions workflow

8. GitHub Actions executes

9. Harbor tracks workflow state

10. Workflow succeeds or fails

11. Harbor updates deployment status

12. User sees final result

13. Deployment remains in history
```

---

# 32. DEPLOYMENT REQUEST VALIDATION

Before a deployment is triggered, Harbor should validate:

* authenticated user
* user permission
* project existence
* environment existence
* environment-project relationship
* valid branch/version
* valid deployment configuration
* required GitHub integration configuration
* deployment constraints defined by the backlog

Invalid deployment requests must not trigger CI/CD workflows.

---

# 33. DEPLOYMENT IDEMPOTENCY AND DUPLICATES

Deployment operations should be designed carefully to avoid accidental duplicate deployments.

For example:

```text
User clicks Deploy
       |
       v
Request sent
       |
       v
Button should not blindly create multiple deployments
```

The implementation should prevent accidental repeated submissions where appropriate.

The exact mechanism may include:

* disabling UI during request
* request identifiers
* state checks
* backend validation

---

# 34. DEPLOYMENT FAILURE

A deployment can fail.

Failure can occur because of:

* invalid configuration
* GitHub API problems
* GitHub Actions failure
* build failure
* test failure
* deployment infrastructure failure
* timeout
* network issue

Harbor should not hide failure.

The user should see:

```text
Deployment: FAILED
```

and should be able to inspect relevant information where available.

---

# 35. GITHUB INTEGRATION FAILURE

GitHub itself may be unavailable or return an error.

Harbor must handle integration failures gracefully.

For example:

```text
Harbor
  |
  v
GitHub API
  |
  X
Failure
```

The application should:

* log the technical failure appropriately
* return a safe error
* not expose secrets
* not falsely report success
* preserve consistent application state

---

# 36. WEBHOOK / STATUS SYNCHRONIZATION

If the approved architecture uses GitHub webhooks, Harbor can receive workflow/deployment events.

Conceptually:

```text
GitHub Actions
       |
       v
GitHub Event/Webhook
       |
       v
Harbor Backend
       |
       v
Update Deployment
       |
       v
Frontend
```

If polling is used instead, the same conceptual goal applies:

```text
Harbor
  |
  v
Check GitHub
  |
  v
Get workflow status
  |
  v
Update Harbor
```

The implementation should follow the architecture already established in the repository.

---

# 37. API ARCHITECTURE

The backend should expose a consistent API.

Logical resource groups include:

```text
/auth
/users
/projects
/environments
/deployments
/logs
/reports
```

The exact routes should follow the established project API conventions.

---

# 38. API PRINCIPLES

Every API endpoint should:

* validate input
* authenticate when required
* authorize when required
* return appropriate HTTP status codes
* use consistent response structures
* handle errors
* avoid leaking sensitive information

---

# 39. EXAMPLE API STRUCTURE

Conceptually:

```text
-- Authentication & Identity --
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/external/google
GET    /api/auth/external/google/callback
GET    /api/auth/external/google/complete
GET    /api/auth/external/github
GET    /api/auth/external/github/callback
GET    /api/auth/external/github/complete
GET    /api/auth/me/auth-methods
DELETE /api/auth/me/auth-methods/:provider

-- Projects & Services --
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id
GET    /api/projects/:id/services
POST   /api/projects/:id/services

-- GitHub API Proxy --
GET    /api/projects/githubintegration/repositories
GET    /api/projects/githubintegration/branches?owner=:owner&repo=:repo
GET    /api/projects/githubintegration/commits?owner=:owner&repo=:repo&branch=:branch

-- Environments --
GET    /api/projects/:id/environments
POST   /api/projects/:id/environments

-- Deployments & Branch/Commit Selection --
GET    /api/deployments
POST   /api/deployments (Payload includes branch & commitHash selection)
GET    /api/deployments/:id
GET    /api/deployments/:id/logs

-- Reporting --
GET    /api/reports/deployments
```

These reflect the established API structure and microservices capabilities.

---

# 40. HTTP STATUS CODES

The API should use meaningful status codes.

Typical examples:

```text
200 OK
201 Created
204 No Content
400 Bad Request
401 Unauthorized / Unauthenticated
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
429 Too Many Requests
500 Internal Server Error
502/503 Integration or Service Error
```

The exact status-code strategy should be consistent throughout the backend.

---

# 41. INPUT VALIDATION

Never trust frontend input.

Validate:

* strings
* IDs
* enums
* branch names
* project identifiers
* environment identifiers
* deployment parameters
* pagination parameters
* filters
* report parameters

Validation should happen server-side.

---

# 42. ERROR HANDLING

Errors should be predictable and safe.

Example:

```json
{
  "success": false,
  "message": "Deployment could not be started."
}
```

Do not expose:

```text
database password
stack trace
API token
internal secret
private credentials
```

to normal users.

Internal logs can contain appropriate technical debugging information, but sensitive information must still be protected.

---

# 43. PROJECT MANAGEMENT FEATURES

The MVP project-management functionality should allow authorized users to manage application/project records.

Potential operations:

```text
Create Project
View Project
Update Project
Delete Project
List Projects
```

The exact CRUD operations depend on the approved backlog.

A project should contain enough information to connect it to GitHub.

---

# 44. PROJECT CREATION

A project creation flow may include:

```text
Project Name
Description
GitHub Repository
Default Branch
```

The backend should validate:

* required fields
* valid repository information
* user permissions
* uniqueness constraints where required

---

# 45. PROJECT DETAILS

A project detail page should provide access to:

```text
Project Information
Repositories
Environments
Current Deployment Information
Deployment History
Reports
```

The UI should make navigation between these concepts simple.

---

# 46. ENVIRONMENT MANAGEMENT FEATURES

Authorized users may manage project environments.

Potential operations:

```text
Create Environment
View Environment
Update Environment
Delete Environment
List Environments
```

Again, exact permissions must follow the approved backlog.

---

# 47. ENVIRONMENT CONFIGURATION

Environment configuration may include deployment-related information.

Sensitive configuration should never be unnecessarily returned to the frontend.

Prefer:

```text
Stored securely
      |
      v
Used by backend/deployment process
```

rather than:

```text
Database
   |
   v
Frontend
   |
   v
User sees secret
```

---

# 48. DEPLOYMENT PAGE

A deployment page should provide enough information to understand one deployment.

Conceptually:

```text
Deployment #123

Project:
Harbor

Environment:
QA

Branch:
develop

Version:
abc123

Triggered By:
User

Status:
Running

Started:
...

Workflow:
...

Logs:
...
```

The exact UI depends on the design system.

---

# 49. DEPLOYMENT HISTORY PAGE

The deployment history page should make previous deployment activity easy to scan.

Useful columns include:

```text
Project
Environment
Version
Branch
Status
Triggered By
Started
Completed
```

Filtering may be implemented where required.

Potential filters:

```text
Project
Environment
Status
Date
User
Branch
```

Only implement filters required by the MVP backlog or clearly justified by the existing design.

---

# 50. LOG VIEWER

The log viewer should make deployment logs readable.

Requirements:

* readable text
* suitable scrolling
* loading state
* unavailable state
* error state
* no accidental secret exposure

Where possible, users should be able to distinguish:

```text
Deployment information
```

from:

```text
Application/system logs
```

---

# 51. REPORTING

Deployment reports should summarize relevant information.

Example:

```text
Deployment Summary

Total Deployments: 50
Successful: 42
Failed: 6
Running: 2
```

Additional information may include:

```text
Deployments by Environment
Deployments over Time
Recent Deployments
Success/Failure Distribution
```

The reporting implementation should not become unnecessarily complex.

---

# 52. DASHBOARD COMPONENTS

The dashboard may contain:

### Summary cards

```text
Projects
Environments
Deployments
Successful
Failed
Running
```

### Recent deployments

```text
Project | Environment | Version | Status | Time
```

### Deployment activity

A visual representation can be used if required.

### Quick navigation

Users should easily reach:

* Projects
* Deployments
* Environments
* Reports

---

# 53. UI STATES

Every important UI should account for:

## Loading

```text
Loading deployments...
```

## Empty

```text
No deployments found.
```

## Error

```text
Unable to load deployments.
```

## Success

```text
Deployment started successfully.
```

## Disabled

Buttons should be disabled when an action cannot safely be performed.

---

# 54. RESPONSIVE DESIGN

The Harbor UI should be usable on common screen sizes.

At minimum:

* desktop
* laptop
* tablet-sized layouts where practical

The primary DevOps workflow should remain usable.

---

# 55. UI DESIGN PRINCIPLES

The interface should be:

* clean
* professional
* consistent
* information-focused
* easy to navigate
* technically oriented
* visually clear

Avoid:

* excessive animations
* unnecessary decorative elements
* overly complicated dashboards
* inconsistent colors
* unclear buttons
* hidden deployment status

---

# 56. STATUS VISUALIZATION

Deployment status should be immediately understandable.

For example:

```text
Pending
Running
Successful
Failed
```

Status should be represented consistently across:

* dashboard
* deployment list
* deployment detail
* history
* reports

Do not rely only on color.

Use:

* text
* icons
* status labels

where appropriate.

---

# 57. SEARCH AND FILTERING

Search/filtering can be used where required to manage larger datasets.

Useful areas:

```text
Projects
Deployments
Deployment History
Reports
```

Do not introduce an unnecessarily complex search engine for the MVP.

---

# 58. PAGINATION

Large lists should not attempt to load unlimited data.

Pagination or controlled limits should be used for:

* projects
* deployments
* history
* logs where appropriate

The exact mechanism should follow the backend/frontend architecture.

---

# 59. SECURITY MODEL

Security is a core requirement.

Important areas include:

```text
Authentication
Authorization
RBAC
Input Validation
Secret Management
API Security
GitHub Token Security
Session Security
Error Handling
Logging
Dependency Security
```

---

# 60. SECRET MANAGEMENT

Never commit secrets.

Never hard-code:

```text
GitHub tokens
API keys
passwords
JWT secrets
database credentials
cloud credentials
```

Use environment variables or an appropriate secret-management mechanism.

Example:

```text
GITHUB_TOKEN=...
DATABASE_URL=...
AUTH_SECRET=...
```

Actual secrets must remain outside source control.

---

# 61. GITHUB TOKEN SECURITY

GitHub credentials should:

* be stored securely
* have the minimum required permissions
* never be returned to the frontend
* never be printed in logs
* never be committed to Git

If a token is accidentally exposed, it should be revoked/rotated.

---

# 62. AUTHORIZATION SECURITY

Never rely on:

```javascript
if (user.role === "admin") {
   showButton();
}
```

as the security mechanism.

Frontend checks improve UX.

Backend checks enforce security.

The backend must independently verify:

```text
Authenticated?
      |
      v
Correct role?
      |
      v
Has permission?
      |
      v
Allowed to access this specific resource?
      |
      v
Perform action
```

---

# 63. IDOR / RESOURCE ACCESS PROTECTION

Harbor must prevent users from accessing arbitrary resources simply by changing an ID.

Example:

```text
GET /deployments/123
```

must not automatically mean:

> Anyone who knows 123 can access deployment 123.

The backend should verify resource ownership/access permissions.

---

# 64. INJECTION PROTECTION

User input must be validated and safely handled.

Protect against:

* SQL injection
* command injection
* XSS
* malicious GitHub inputs
* unsafe shell execution
* path traversal
* unsafe deserialization

Use established libraries and parameterized queries rather than constructing unsafe queries manually.

---

# 65. XSS PROTECTION

User-controlled content should not be blindly rendered as HTML.

Potentially user-controlled content includes:

* project names
* descriptions
* branch names
* deployment messages
* log content

The UI should safely render such content.

---

# 66. CSRF / SESSION SECURITY

The authentication/session architecture must account for appropriate browser security protections.

Depending on the authentication approach, this may include:

* secure cookies
* HttpOnly
* SameSite
* CSRF protection
* short-lived access tokens
* refresh token protection

Follow the chosen authentication architecture.

---

# 67. RATE LIMITING

Where appropriate, rate limiting should protect sensitive endpoints.

Particularly:

```text
Login
Authentication
Deployment triggering
Expensive report endpoints
External API interactions
```

Do not over-engineer rate limiting for the MVP if it is not required, but security-sensitive operations should be considered.

---

# 68. AUDITABILITY

Important actions should be traceable where required.

Examples:

```text
Login
Deployment Trigger
Project Creation
Environment Modification
User/Role Modification
```

At minimum, deployment records should identify who initiated the deployment.

---

# 69. DEPLOYMENT SAFETY

Deployment is a sensitive operation.

Before triggering:

```text
Authenticate
   |
   v
Authorize
   |
   v
Validate Project
   |
   v
Validate Environment
   |
   v
Validate Version
   |
   v
Trigger Workflow
```

Never allow a user to bypass these checks by directly calling an API.

---

# 70. CI

Continuous Integration should automatically verify changes.

Typical CI steps:

```text
Checkout
   |
Install dependencies
   |
Lint
   |
Build
   |
Unit tests
   |
Integration/API tests
   |
Security checks where configured
```

CI should fail when required quality gates fail.

---

# 71. CD

Continuous Delivery/Deployment handles deployment workflows.

Conceptually:

```text
Code
 |
 v
CI
 |
 v
Approved Build
 |
 v
Environment Deployment
 |
 v
GitHub Actions
 |
 v
Deployment Result
```

The exact automation should follow the project's approved process.

---

# 72. DEVELOPMENT FLOW

Recommended development flow:

```text
Create Feature Branch
        |
        v
Implement Feature
        |
        v
Run Local Tests
        |
        v
Commit
        |
        v
Push Branch
        |
        v
Pull Request
        |
        v
CI
        |
        v
Code Review
        |
        v
Merge
        |
        v
Development/QA
        |
        v
Testing
        |
        v
Release
```

---

# 73. BRANCHING STRATEGY

The repository should maintain controlled branches.

Conceptually:

```text
main
 |
 +---- development
 |
 +---- feature/*
 |
 +---- bugfix/*
 |
 +---- release/*
 |
 +---- hotfix/*
```

The exact branch names should follow the existing repository.

Rules:

* Do not directly push unfinished features to protected branches.
* Use pull requests.
* Run CI before merging.
* Keep branches focused.
* Avoid enormous long-lived feature branches.
* Delete merged branches when appropriate.

---

# 74. COMMIT PRACTICES

Commits should be:

* focused
* understandable
* related to one logical change
* free from unrelated changes

Avoid:

```text
fix everything
changes
final final
test
asdf
```

Prefer meaningful messages such as:

```text
feat: add deployment status API
fix: prevent unauthorized deployment access
test: add deployment service tests
docs: update deployment API documentation
```

---

# 75. PULL REQUESTS

Pull requests should communicate:

* what changed
* why it changed
* affected components
* tests performed
* known limitations
* screenshots where UI changed

PRs should not contain:

* secrets
* debugging code
* unrelated changes
* generated temporary files

---

# 76. ENVIRONMENT STRATEGY

The application should distinguish between:

```text
Local Development
Development
QA
Production
```

The exact environments depend on project infrastructure.

Each environment should have appropriate configuration.

---

# 77. LOCAL DEVELOPMENT

Local development should allow developers to run:

```text
Frontend
Backend
Database
```

using the repository's documented setup.

A developer should not need undocumented manual configuration.

---

# 78. QA ENVIRONMENT

QA should test a consistent deployed build.

Conceptually:

```text
Code
 |
 v
CI
 |
 v
QA Build
 |
 v
QA Environment
 |
 v
QA Testing
```

QA should not depend exclusively on a developer's laptop.

---

# 79. PRODUCTION

Production should contain the controlled release version.

Production access should be restricted.

Deployment should follow the approved release process.

Do not allow arbitrary users to deploy production without appropriate authorization.

---

# 80. ENVIRONMENT CONFIGURATION

Environment-specific configuration should not be hard-coded.

For example:

```text
Development
DATABASE_URL=development
API_URL=development
GITHUB_CONFIG=development
```

and:

```text
Production
DATABASE_URL=production
API_URL=production
GITHUB_CONFIG=production
```

Secrets must be supplied securely.

---

# 81. TESTING STRATEGY

Harbor requires multiple layers of testing.

Conceptually:

```text
Unit Tests
     |
     v
Integration/API Tests
     |
     v
Frontend Tests
     |
     v
End-to-End Tests
     |
     v
Security Tests
     |
     v
Performance Tests where required
```

---

# 82. UNIT TESTING

Unit tests should cover isolated business logic.

Examples:

* deployment validation
* status transformation
* permission checks
* report calculations
* utility functions
* service-level logic

---

# 83. API / INTEGRATION TESTING

API tests should verify:

* authentication
* authorization
* CRUD operations
* validation
* deployment creation
* deployment status
* project/environment relationships
* error handling

---

# 84. END-TO-END TESTING

E2E tests should validate important user journeys.

Example:

```text
Login
  |
  v
Dashboard
  |
  v
Select Project
  |
  v
Select Environment
  |
  v
Trigger Deployment
  |
  v
Observe Deployment
  |
  v
View Result
```

The most important workflows should be tested end-to-end.

---

# 85. SECURITY TESTING

Security tests should cover relevant areas such as:

### Authentication

* invalid credentials
* protected routes
* expired/invalid tokens

### Authorization

* unauthorized role
* unauthorized resource
* direct API manipulation

### Input validation

* invalid IDs
* malformed data
* injection attempts

### Secrets

* API response does not expose secrets
* frontend does not expose GitHub tokens
* logs do not expose secrets

### Deployment authorization

* unauthorized user cannot trigger deployment

---

# 86. PERFORMANCE TESTING

Where required by the project, performance testing should focus on important operations.

Examples:

* login
* project list
* deployment list
* deployment history
* report generation
* deployment status retrieval

Do not optimize blindly.

Measure first.

---

# 87. QA BUG REPORTING

A bug report should include:

```text
Bug ID
Title
Description
Environment
Build/Version
Preconditions
Steps to Reproduce
Expected Result
Actual Result
Severity
Priority
Evidence
Status
```

Screenshots/videos/logs should be attached where useful.

---

# 88. SEVERITY

A practical classification can be:

```text
Critical
High
Medium
Low
```

Severity describes impact.

Priority describes urgency.

Do not automatically treat them as identical.

---

# 89. QA DOCUMENTATION

QA documentation should cover:

* test strategy
* test cases
* test execution
* defect tracking
* regression testing
* API testing
* security testing
* E2E testing
* performance testing where required
* test results
* coverage where applicable

---

# 90. API DOCUMENTATION

The API should be documented.

Documentation should include:

```text
Endpoint
HTTP Method
Authentication
Authorization
Request
Parameters
Response
Errors
Example
```

Swagger/OpenAPI is appropriate if supported by the existing project.

---

# 91. README

The README should explain:

```text
What Harbor is
What it does
Architecture
Prerequisites
Installation
Environment Variables
Database Setup
Running Locally
Testing
API Documentation
Deployment
Contributing
```

The README should be usable by a new developer.

---

# 92. ARCHITECTURE DOCUMENTATION

Architecture documentation should explain:

```text
Frontend
Backend
Database
GitHub
GitHub Actions
Authentication
Deployment Flow
Environment Flow
```

A high-level architecture diagram is useful.

---

# 93. SUGGESTED ARCHITECTURE DIAGRAM

```text
                    ┌──────────────────────┐
                    │       Harbor User    │
                    └──────────┬───────────┘
                               │
                               v
                    ┌──────────────────────┐
                    │   Harbor Frontend    │
                    │                      │
                    │ Dashboard            │
                    │ Projects             │
                    │ Environments         │
                    │ Deployments          │
                    │ Logs                 │
                    │ Reports              │
                    └──────────┬───────────┘
                               │
                               │ HTTPS/API
                               v
                    ┌──────────────────────┐
                    │   Harbor Backend     │
                    │                      │
                    │ Auth                 │
                    │ RBAC                 │
                    │ Business Logic       │
                    │ Projects             │
                    │ Environments         │
                    │ Deployments          │
                    │ Reports              │
                    └───────┬───────┬──────┘
                            │       │
                            │       │
                            v       v
                    ┌──────────┐ ┌──────────────┐
                    │ Database │ │   GitHub     │
                    └──────────┘ │              │
                                 │ Repositories │
                                 │ Actions      │
                                 └──────┬───────┘
                                        │
                                        v
                                ┌──────────────┐
                                │GitHub Actions│
                                │              │
                                │ Build        │
                                │ Test         │
                                │ Deploy       │
                                └──────┬───────┘
                                       │
                                       v
                                ┌──────────────┐
                                │ Application  │
                                │ Environment  │
                                └──────────────┘
```

---

# 94. FRONTEND/BACKEND SEPARATION

The frontend should handle presentation.

The backend should handle:

* business logic
* security
* integration
* persistence

Do not put sensitive business logic only in the frontend.

---

# 95. SERVICE LAYER

Where the existing architecture supports it, external integrations should be isolated behind services.

Conceptually:

```text
Controller
    |
    v
Service
    |
    +---- Database
    |
    +---- GitHub
    |
    +---- GitHub Actions
```

This improves testability and maintainability.

---

# 96. GITHUB SERVICE

A dedicated GitHub integration layer is preferable to scattering GitHub API calls throughout the application.

Conceptually:

```text
GitHubService

getRepository()
listRepositories()
getWorkflow()
triggerWorkflow()
getWorkflowRun()
getWorkflowLogs()
```

Exact methods depend on requirements.

---

# 97. DEPLOYMENT SERVICE

Deployment business logic should be centralized.

Conceptually:

```text
DeploymentService

validateDeployment()
createDeployment()
triggerWorkflow()
getDeploymentStatus()
updateDeploymentStatus()
getDeploymentHistory()
getDeploymentLogs()
```

Again, exact implementation depends on the existing repository.

---

# 98. REPORT SERVICE

Reporting logic should be separated from UI concerns.

Conceptually:

```text
ReportService

getDeploymentSummary()
getDeploymentStatistics()
getEnvironmentStatistics()
getRecentActivity()
```

---

# 99. DATABASE INTEGRITY

The backend must maintain consistent relationships.

Examples:

A deployment should not reference:

```text
non-existent project
```

or:

```text
environment belonging to another project
```

The system must validate these relationships.

---

# 100. TRANSACTIONAL CONSIDERATIONS

Operations that modify multiple related records should consider transactional consistency.

Example:

```text
Create Deployment
       |
       +--> Save deployment record
       |
       +--> Trigger workflow
```

The implementation must avoid leaving the database in a misleading state.

The exact transaction/outbox/retry strategy should match the project's complexity.

Do not over-engineer this unnecessarily.

---

# 101. EXTERNAL API FAILURE HANDLING

External systems are unreliable.

GitHub can:

* timeout
* return errors
* rate-limit requests
* return unavailable responses

Harbor should handle these cases.

Never assume:

```text
GitHub API call = always succeeds
```

---

# 102. RETRY BEHAVIOR

Retries should only occur where safe.

For read operations, retries may be reasonable.

For deployment-trigger operations, blindly retrying can accidentally create duplicate deployments.

Deployment-trigger retries must be designed carefully.

---

# 103. LOGGING

Application logs should provide enough information to diagnose problems.

Useful information:

```text
timestamp
request
user/context where appropriate
operation
result
error information
correlation/request ID where supported
```

Do not log secrets.

---

# 104. MONITORING HARBOR ITSELF

The Harbor MVP is not a full observability platform, but basic application health should be possible.

Potential endpoint:

```text
/health
```

The health mechanism should indicate whether the application is operating.

Do not confuse Harbor health monitoring with deployment monitoring.

---

# 105. HEALTH VS DEPLOYMENT STATUS

These are different.

### Harbor health

```text
Is Harbor itself functioning?
```

### Deployment status

```text
Did the application deployment succeed?
```

Do not mix them.

---

# 106. AUDIT TRAIL

Where required, important actions should be traceable.

Examples:

```text
Who triggered deployment?
When?
Which environment?
Which version?
What was the result?
```

Deployment records inherently provide part of this audit trail.

---

# 107. DATA PRIVACY

Only collect data required by the application.

Avoid unnecessary personal information.

Protect user information.

Do not expose private user information through APIs unnecessarily.

---

# 108. DEPENDENCY MANAGEMENT

Dependencies should:

* be intentionally selected
* be kept reasonably current
* be reviewed for vulnerabilities
* not be duplicated unnecessarily

Do not install a library merely because it makes one tiny task slightly easier.

---

# 109. CODE QUALITY

Code should be:

* readable
* maintainable
* testable
* modular
* consistent
* appropriately documented

Avoid unnecessary:

* duplication
* huge functions
* huge components
* deeply nested logic
* magic values
* global mutable state

---

# 110. TYPES AND VALIDATION

Where the chosen technology supports strong typing, use it consistently.

Do not use broad escape hatches everywhere such as:

```text
any
unknown
unchecked casts
```

unless justified.

API input should still be validated at runtime even when compile-time typing exists.

---

# 111. FRONTEND STATE

Frontend state should distinguish between:

```text
Loading
Success
Error
Empty
Updating
```

Avoid showing stale information as if it were current.

Deployment status is particularly important.

---

# 112. REAL-TIME DEPLOYMENT STATUS

If the architecture supports polling or event-based updates, the UI can reflect changing deployment state.

Conceptually:

```text
Pending
   |
   v
Running
   |
   +----> Successful
   |
   +----> Failed
```

The UI should not claim a final result until it has reliable status information.

---

# 113. REFRESH BEHAVIOR

Users should be able to obtain current deployment status.

The implementation may use:

* refresh
* polling
* events/webhooks
* another approved mechanism

The mechanism should be appropriate to the project's architecture.

---

# 114. CONCURRENCY

Multiple users may interact with the same project.

The system should consider:

```text
User A starts deployment
User B views deployment
User C attempts another deployment
```

Business rules should determine what is allowed.

Do not assume only one user ever uses Harbor.

---

# 115. PRODUCTION DEPLOYMENT CONTROL

Production deployments are potentially sensitive.

The system should enforce whatever production permissions and workflow controls are defined in the approved backlog.

Do not allow a user to bypass production authorization simply by calling the deployment endpoint manually.

---

# 116. ENVIRONMENT ISOLATION

A deployment to:

```text
Development
```

must not accidentally become:

```text
Production
```

The environment must be explicitly represented and validated.

---

# 117. BRANCH/VERSION ASSOCIATION

A deployment should clearly identify what code/version was deployed.

Examples:

```text
Branch:
develop
```

or:

```text
Commit:
abc123
```

or another approved version identifier.

This is essential for traceability.

---

# 118. DEPLOYMENT TRACEABILITY

A user should be able to trace:

```text
Deployment
   |
   +--> Project
   |
   +--> Environment
   |
   +--> Version
   |
   +--> User
   |
   +--> GitHub Workflow
   |
   +--> Status
   |
   +--> Logs
```

This is one of Harbor's most important qualities.

---

# 119. DEPLOYMENT HISTORY AS A SOURCE OF TRUTH

Harbor's deployment history should provide a coherent record of deployment activity.

It should not simply show a generic timestamp.

A useful record tells the complete story:

```text
WHO
WHAT
WHERE
WHEN
RESULT
WORKFLOW
```

---

# 120. REPORT DATA CONSISTENCY

Reports must use the same underlying deployment data as the deployment history.

Avoid situations where:

```text
Deployment page = 20 deployments
Report = 17 deployments
```

unless there is an explicitly documented filter or time range explaining the difference.

---

# 121. FILTERED REPORTS

If filtering exists, the UI should make the selected filter obvious.

For example:

```text
Environment: QA
Period: Last 30 Days
Status: Failed
```

The user should understand what the report represents.

---

# 122. EMPTY STATES

A new Harbor installation may contain no data.

The application should not look broken.

Examples:

```text
No projects yet.
Create your first project to get started.
```

or:

```text
No deployments found for this environment.
```

---

# 123. FIRST-TIME EXPERIENCE

A first-time user should understand:

1. what Harbor does
2. what to do next
3. how to create/connect a project
4. how environments work
5. how deployments work

Avoid forcing users to understand the entire system before doing anything useful.

---

# 124. ACCESS DENIED EXPERIENCE

If the user lacks permission:

```text
You do not have permission to perform this action.
```

Do not expose sensitive details about why the user lacks access.

---

# 125. NOT FOUND EXPERIENCE

If a project/deployment/environment does not exist:

```text
Resource not found.
```

The application should not crash.

---

# 126. NETWORK FAILURE EXPERIENCE

If the backend is unavailable:

```text
Unable to connect to Harbor.
Please try again.
```

The UI should fail gracefully.

---

# 127. DEPLOYMENT CONFIRMATION

Because deployment is an important operation, the UI may require explicit confirmation where appropriate.

For example:

```text
Deploy Harbor Web to Production?
```

with:

```text
Cancel
Deploy
```

This should be used where the approved UX requires it.

---

# 128. DESTRUCTIVE ACTIONS

Destructive actions such as deleting projects or environments should have appropriate confirmation.

Do not make destructive operations one accidental click away.

---

# 129. ACCESSIBILITY

The UI should follow basic accessibility practices.

Examples:

* meaningful labels
* keyboard accessibility
* readable contrast
* clear focus states
* accessible buttons
* semantic structure
* status not conveyed only through color

---

# 130. INTERNATIONALIZATION

Unless explicitly required, Harbor MVP does not need a complex multilingual system.

The default UI language can remain consistent with the project requirements.

Do not add internationalization architecture unnecessarily.

---

# 131. TIME AND DATE HANDLING

Deployment timestamps should be stored consistently.

Prefer a standard representation such as UTC internally.

The frontend can display dates/times appropriately for users.

Avoid ambiguous timestamps.

---

# 132. TIMEZONE CONSISTENCY

A deployment record should not appear to have different dates depending on where the backend is running.

Use a consistent storage convention.

Display localized time where appropriate.

---

# 133. FILE/LOG SIZE

Deployment logs can become large.

The system should avoid blindly loading unlimited data into the browser.

Use appropriate:

* pagination
* streaming
* truncation
* lazy loading

where necessary.

Do not implement complexity that is unnecessary for the MVP's expected scale.

---

# 134. SCALABILITY

Harbor MVP does not need hyperscale architecture.

However, basic good practices should prevent obvious bottlenecks.

Examples:

* pagination
* database indexes where useful
* reasonable API response sizes
* efficient queries
* avoiding unnecessary repeated external API calls

---

# 135. CACHING

Caching may be introduced where beneficial.

Potential candidates:

* GitHub metadata
* repository information
* non-sensitive report data

Do not cache sensitive information carelessly.

Do not introduce caching complexity without a clear benefit.

---

# 136. GITHUB RATE LIMITS

GitHub APIs may impose rate limits.

The implementation should avoid unnecessary repeated API requests.

Where appropriate:

* cache stable data
* request only necessary fields
* avoid excessive polling
* handle rate-limit errors

---

# 137. DATABASE INDEXING

Frequently queried fields may require indexes.

Examples:

```text
projectId
environmentId
deployment status
createdAt
```

The exact indexes should be determined from actual query patterns.

---

# 138. API PAGINATION

List endpoints should support controlled result sizes where necessary.

Conceptually:

```text
?page=1&limit=20
```

The exact API format depends on the project.

---

# 139. API FILTERING

Filtering can be applied to deployment history.

Example concept:

```text
GET /deployments?environment=qa&status=failed
```

Again, follow the established API contract rather than inventing endpoints.

---

# 140. API DOCUMENTATION AND TESTING

Every important endpoint should have:

* documentation
* validation
* tests
* authorization tests
* error tests

A successful `200` test is not enough.

Also test:

```text
401
403
404
400
409
500/integration failure
```

where relevant.

---

# 141. TEST PYRAMID

Prefer:

```text
          E2E
         /   \
       API / Integration
       /       \
     Unit Tests
```

Most business logic should be tested at lower levels.

E2E tests should cover critical user journeys.

---

# 142. REGRESSION TESTING

When a bug is fixed:

1. reproduce it
2. create a regression test where appropriate
3. implement the fix
4. rerun relevant tests
5. run broader regression tests

Do not repeatedly fix the same bug without adding protection where practical.

---

# 143. DEFINITION OF READY

A feature/user story should ideally have:

* clear requirement
* acceptance criteria
* dependencies understood
* design/implementation direction
* test expectations

before significant development begins.

---

# 144. DEFINITION OF DONE

A Harbor feature is not complete merely because code compiles.

A feature is generally done when:

```text
Requirement implemented
       +
Backend implemented
       +
Frontend implemented where required
       +
Database implemented where required
       +
Authentication/authorization handled
       +
Validation handled
       +
Error handling handled
       +
Tests added
       +
Security considered
       +
Documentation updated
       +
CI passes
       +
QA verified
```

---

# 145. USER STORIES

Harbor user stories should generally follow this structure:

```text
As a [role],
I want to [action],
so that [benefit].
```

Example:

```text
As a developer,
I want to view deployment history,
so that I can understand what versions were previously deployed.
```

---

# 146. ACCEPTANCE CRITERIA

Acceptance criteria should be testable.

Example:

```text
Given an authenticated user
When the user opens a project
Then the project's environments are displayed.
```

For deployment:

```text
Given an authorized user
When the user submits a valid deployment request
Then Harbor triggers the configured deployment workflow.
```

---

# 147. BACKLOG PRINCIPLE

The backlog is the authoritative source for exact sprint-level scope.

Do not assume that every possible Harbor feature must be implemented.

When implementing a backlog item:

```text
Read User Story
       |
       v
Read Acceptance Criteria
       |
       v
Inspect Existing Code
       |
       v
Identify Affected Layers
       |
       v
Implement
       |
       v
Test
       |
       v
Document
```

---

# 148. AI CODING AGENT BEHAVIOR

Any AI coding agent working on Harbor should follow these rules.

## Before changing code

Inspect:

* repository structure
* package files
* frontend
* backend
* database
* authentication
* API routes
* existing tests
* CI workflows
* environment files/examples
* documentation

Do not immediately start rewriting files.

---

# 149. DO NOT INVENT ARCHITECTURE

If the repository already has:

```text
React
Node
Express
PostgreSQL
Prisma
```

or another established stack, use it.

Do not replace the stack simply because another stack is preferred.

The existing repository is the implementation source of truth.

---

# 150. DO NOT REWRITE WORKING CODE UNNECESSARILY

An AI agent should not:

* rewrite the entire frontend
* replace the database
* replace authentication
* replace the API architecture
* rename everything
* introduce a new framework

unless explicitly instructed.

---

# 151. PRESERVE EXISTING CONTRACTS

Before modifying an API, inspect:

* frontend consumers
* tests
* documentation
* other services
* database relationships

Avoid breaking existing contracts unnecessarily.

---

# 152. CHANGE IMPACT ANALYSIS

Before implementing a change, identify:

```text
Frontend
Backend
Database
External APIs
Authentication
Authorization
Tests
Documentation
CI/CD
```

Ask:

> What else can this change affect?

---

# 153. AI AGENT IMPLEMENTATION LOOP

The preferred coding-agent loop is:

```text
Understand
   |
   v
Inspect
   |
   v
Plan
   |
   v
Implement
   |
   v
Test
   |
   v
Review
   |
   v
Fix
   |
   v
Document
```

Do not skip testing.

---

# 154. AI AGENT SECURITY RULE

The coding agent must never:

* hard-code credentials
* print secrets
* commit `.env` files containing real secrets
* disable authentication to make a test pass
* bypass authorization
* remove security checks because they are inconvenient
* expose GitHub tokens to the frontend

---

# 155. AI AGENT TESTING RULE

After implementation:

1. run targeted tests
2. run relevant integration tests
3. run lint/type checks
4. run build
5. run broader tests when appropriate

If tests fail, investigate the root cause rather than simply deleting or weakening the test.

---

# 156. AI AGENT DOCUMENTATION RULE

If an implementation changes:

* API
* environment variables
* database
* setup process
* deployment
* architecture

update the relevant documentation.

---

# 157. AI AGENT OUTPUT EXPECTATIONS

When asked to implement a feature, the coding agent should report:

```text
What changed
Files changed
Database changes
API changes
Frontend changes
Tests added
Tests executed
Known limitations
Configuration changes
```

This makes implementation review easier.

---

# 158. HARBOR CORE FEATURE MAP

The complete MVP can be viewed as:

```text
HARBOR
│
├── Authentication
│   ├── Login
│   ├── Session/token management
│   └── Protected routes
│
├── Authorization
│   ├── Roles
│   ├── Permissions
│   └── Resource access
│
├── Dashboard
│   ├── Summary
│   ├── Recent deployments
│   └── Deployment activity
│
├── Projects
│   ├── Create
│   ├── View
│   ├── Update
│   ├── Delete where authorized
│   └── GitHub repository association
│
├── Environments
│   ├── Create
│   ├── View
│   ├── Update
│   ├── Delete where authorized
│   └── Deployment configuration
│
├── Deployments
│   ├── Create/trigger
│   ├── Validate
│   ├── Monitor
│   ├── Status
│   ├── Details
│   └── History
│
├── Logs
│   └── Deployment logs
│
├── Reports
│   ├── Deployment summary
│   ├── Success/failure
│   ├── Environment activity
│   └── Recent activity
│
├── GitHub
│   ├── Repository integration
│   └── GitHub API
│
├── GitHub Actions
│   ├── Workflow trigger
│   ├── Workflow status
│   └── Workflow logs
│
└── Quality & Security
    ├── Validation
    ├── Testing
    ├── RBAC
    ├── Secret management
    ├── Error handling
    └── CI/CD
```

---

# 159. COMPLETE END-TO-END EXAMPLE

Consider an application called:

```text
Harbor Demo App
```

It is connected to:

```text
GitHub Repository:
organization/harbor-demo
```

It has:

```text
Development
QA
Production
```

A developer wants to deploy commit:

```text
abc123
```

to QA.

The process is:

```text
Developer
   |
   v
Harbor Login
   |
   v
Dashboard
   |
   v
Harbor Demo App
   |
   v
QA Environment
   |
   v
Select abc123
   |
   v
Click Deploy
   |
   v
Harbor Backend
   |
   +--> Authenticate user
   |
   +--> Check role
   |
   +--> Check project
   |
   +--> Check environment
   |
   +--> Validate version
   |
   v
Create Deployment Record
   |
   v
Trigger GitHub Actions
   |
   v
GitHub Actions
   |
   +--> Checkout abc123
   |
   +--> Build
   |
   +--> Test
   |
   +--> Deploy to QA
   |
   v
Workflow Result
   |
   +---- Success
   |
   +---- Failure
   |
   v
Harbor
   |
   v
Update Deployment
   |
   v
Deployment History
   |
   +--> Status
   +--> Version
   +--> User
   +--> Environment
   +--> Time
   +--> Workflow
   +--> Logs
```

This example represents the central Harbor use case.

---

# 160. FAILURE EXAMPLE

Suppose deployment fails during the build.

```text
Harbor
   |
   v
GitHub Actions
   |
   v
Build
   |
   X
Build Failed
```

Harbor should eventually show:

```text
Status: Failed
```

The deployment history should preserve the failed deployment.

The user should be able to inspect relevant logs.

Harbor should not report:

```text
Success
```

simply because the workflow was initially triggered.

---

# 161. MULTIPLE DEPLOYMENTS

Suppose the deployment history is:

```text
#105 | QA | abc100 | SUCCESS
#106 | QA | abc110 | SUCCESS
#107 | QA | abc120 | FAILED
#108 | QA | abc130 | SUCCESS
```

The current successful deployment may be:

```text
abc130
```

while history preserves all previous attempts.

This is important for traceability.

---

# 162. PROJECT-ENVIRONMENT-DEPLOYMENT MODEL

The fundamental data relationship is:

```text
Project
   |
   +----------------+
   |                |
   v                v
Environment       Deployment
   |                |
   |                +--> Version
   |                +--> Status
   |                +--> User
   |                +--> Workflow
   |
   +<---------------+
```

A deployment belongs to an environment, and that environment belongs to the project.

---

# 163. HARBOR'S VALUE PROPOSITION

Harbor's value comes from reducing deployment fragmentation.

Without Harbor:

```text
Developer
  |
  +--> GitHub
  |
  +--> Repository
  |
  +--> Actions
  |
  +--> Workflow
  |
  +--> Logs
  |
  +--> History
```

With Harbor:

```text
Developer
    |
    v
  Harbor
    |
    +--> Project
    +--> Environment
    +--> Deployment
    +--> Status
    +--> History
    +--> Logs
    +--> Reports
```

GitHub remains underneath.

Harbor becomes the deployment-oriented control and visibility layer.

---

# 164. WHAT MAKES THE MVP COMPLETE

The MVP should demonstrate a coherent end-to-end system.

It should not merely contain disconnected screens.

A complete flow should work:

```text
User Authentication
       ↓
Dashboard
       ↓
Project
       ↓
Environment
       ↓
Deployment
       ↓
GitHub Actions
       ↓
Deployment Status
       ↓
Logs
       ↓
History
       ↓
Reports
```

If these pieces are implemented but cannot work together, the product is not truly complete.

---

# 165. MVP FEATURE PRIORITY

The core priorities are:

## Priority 1 — Authentication and Security

Without secure access, the deployment platform cannot be trusted.

## Priority 2 — Projects

Harbor needs to know what applications it manages.

## Priority 3 — Environments

Harbor needs to know where applications are deployed.

## Priority 4 — Deployments

This is the central product function.

## Priority 5 — GitHub/GitHub Actions Integration

This connects Harbor to actual deployment execution.

## Priority 6 — Deployment Status

Users need to know what happened.

## Priority 7 — Logs

Users need troubleshooting visibility.

## Priority 8 — History

Users need deployment traceability.

## Priority 9 — Reports

Users need deployment-level summaries.

## Priority 10 — UI/UX Refinement

The interface should make all of the above easy to use.

---

# 166. WHAT SHOULD NOT BE PRIORITIZED OVER CORE FUNCTIONALITY

Do not spend substantial development time on:

* decorative animations
* advanced themes
* unnecessary charts
* complex customization
* elaborate onboarding
* unrelated integrations
* speculative AI functionality

while basic deployment functionality is incomplete.

---

# 167. MVP QUALITY BAR

The MVP should be:

### Functional

Core workflows actually work.

### Secure

Authentication and authorization cannot be bypassed.

### Testable

Important functionality has automated tests.

### Maintainable

Another developer can understand the code.

### Documented

A developer can set up and use the project.

### Observable

Deployment state and relevant execution information are visible.

### Consistent

Frontend, backend, database, and external integration agree about system state.

---

# 168. IMPORTANT DISTINCTION: DEPLOYMENT VS CI

CI:

```text
Build
Test
Validate
```

Deployment:

```text
Take approved version
Deploy to environment
```

Harbor focuses primarily on deployment management and visibility.

GitHub Actions can perform:

```text
Build
Test
Deploy
```

Harbor should coordinate/observe rather than replace the workflow engine.

---

# 169. IMPORTANT DISTINCTION: HARBOR VS GITHUB

GitHub:

```text
Source Code
Repository
Git
Pull Requests
Actions
Workflow Execution
```

Harbor:

```text
Deployment Management
Environment Management
Deployment Visibility
Deployment History
Deployment Reporting
```

There may be overlap in information, but Harbor is providing a deployment-focused abstraction.

---

# 170. IMPORTANT DISTINCTION: HARBOR VS KUBERNETES

Kubernetes, if used underneath a deployment, manages containerized workloads and infrastructure orchestration.

Harbor MVP does not need to become a Kubernetes management interface.

A deployment can ultimately target whatever infrastructure is defined by the project's deployment pipeline.

Harbor's responsibility is the deployment-management layer.

---

# 171. IMPORTANT DISTINCTION: HARBOR VS MONITORING

Monitoring answers:

> Is my running application healthy?

Harbor primarily answers:

> What was deployed, where, when, by whom, and did the deployment succeed?

Do not turn Harbor MVP into a full monitoring platform.

---

# 172. IMPORTANT DISTINCTION: HARBOR VS PROJECT MANAGEMENT

Project in Harbor means:

> An application/repository managed for deployment.

It does not necessarily mean:

> A Jira project or task-management workspace.

Do not introduce sprint boards, issue management, task assignment, etc., unless explicitly required.

---

# 173. COMPLETE MVP DOMAIN FLOW

The complete conceptual domain flow is:

```text
USER
 |
 | Authentication
 v
HARBOR
 |
 | Authorization
 v
PROJECT
 |
 | Environment association
 v
ENVIRONMENT
 |
 | Deployment request
 v
DEPLOYMENT
 |
 | Integration
 v
GITHUB
 |
 | Workflow
 v
GITHUB ACTIONS
 |
 | Execution
 v
TARGET ENVIRONMENT
 |
 | Result
 v
DEPLOYMENT STATUS
 |
 +--> LOGS
 |
 +--> HISTORY
 |
 +--> REPORTS
 |
 v
HARBOR DASHBOARD
```

---

# 174. AI AGENT SOURCE-OF-TRUTH HIERARCHY

When making implementation decisions, use the following priority order:

```text
1. Explicit user instruction
        ↓
2. Approved product/backlog requirements
        ↓
3. Acceptance criteria
        ↓
4. Existing repository architecture
        ↓
5. Existing API/database contracts
        ↓
6. Existing tests
        ↓
7. This Harbor context document
        ↓
8. General engineering best practices
```

Do not override explicit requirements with assumptions.

---

# 175. IF SOMETHING IS UNCLEAR

An AI coding agent should inspect the repository first.

If the requirement is still genuinely ambiguous:

* do not invent major functionality
* do not redesign the system
* do not add unrelated features
* identify the ambiguity
* use the smallest reasonable implementation consistent with the existing architecture

---

# 176. DO NOT OVER-ENGINEER THE MVP

Avoid unnecessary:

```text
microservices
event buses
Kafka
Kubernetes operators
complex distributed systems
multi-region architecture
multi-cloud abstraction
AI agents
complex service meshes
advanced workflow engines
```

unless explicitly required.

A well-structured modular application is preferable to unnecessary complexity.

---

# 177. DO NOT UNDER-ENGINEER SECURITY

Conversely, do not simplify away:

```text
authentication
authorization
input validation
secret management
secure API design
resource access control
deployment authorization
```

Security is not optional simply because this is an MVP.

---

# 178. HARBOR MVP SUCCESS CRITERIA

A successful MVP should allow an authorized user to:

```text
1. Log in
2. Access the dashboard
3. View projects
4. View project environments
5. Select an environment
6. View deployment state
7. Trigger an allowed deployment
8. Have Harbor interact with GitHub/GitHub Actions
9. See deployment progress/status
10. See whether it succeeded or failed
11. Inspect relevant logs
12. View deployment history
13. View deployment-related reports
14. Perform only actions allowed by their role
```

The exact capabilities depend on the approved backlog.

---

# 179. FINAL PRODUCT MODEL

The entire Harbor MVP can be summarized as:

```text
                     HARBOR
                       |
        +--------------+--------------+
        |              |              |
        v              v              v
    Projects      Environments    Deployments
                                      |
                    +-----------------+----------------+
                    |                 |                |
                    v                 v                v
                 Status            History           Logs
                                      |
                                      v
                                   Reports
                                      |
                                      v
                              GitHub Integration
                                      |
                                      v
                               GitHub Actions
                                      |
                                      v
                              Actual Deployment
```

---

# 180. FINAL PRINCIPLE FOR ALL CONTRIBUTORS

Whenever implementing, reviewing, testing, or documenting Harbor, ask:

> **Does this make Harbor better at securely managing and providing visibility into application deployments?**

If yes, it may belong in the product.

If it does not support the approved requirements or the core deployment-management workflow, it should not automatically be added to the MVP.

The central Harbor workflow remains:

```text
AUTHENTICATE
     ↓
SELECT PROJECT
     ↓
SELECT ENVIRONMENT
     ↓
SELECT VERSION / BRANCH
     ↓
VALIDATE PERMISSIONS
     ↓
TRIGGER DEPLOYMENT
     ↓
GITHUB ACTIONS EXECUTES
     ↓
MONITOR STATUS
     ↓
VIEW RESULT
     ↓
VIEW LOGS
     ↓
VIEW HISTORY
     ↓
VIEW REPORTS
```

## HARBOR IN ONE FINAL SENTENCE

> **Harbor is a centralized, secure deployment management and visibility platform that connects development teams to their GitHub-based CI/CD workflows, allowing authorized users to manage projects and environments, initiate and monitor deployments, inspect deployment logs and history, and understand deployment activity through a single interface.**

---

# 181. MULTI-SERVICE ARCHITECTURE (ARCHITECTURAL DECISION)

**Core Decision**: A single project in Harbor can consist of multiple **Services** (e.g., frontend, backend, database). 

Services are conceptually located inside Harbor Projects. Instead of a project being a single monolithic deployment unit, a project acts as a logical grouping for one or more services. 

Environments within a project then act as the target where these services are deployed and run. This architectural decision enables Harbor to seamlessly support microservice architectures and multi-component applications under a unified project umbrella.

**Updated Conceptual Flow:**
```text
HARBOR
  |
  +--> Projects
         |
         +--> Services (Frontend, Backend, etc.)
         |
         +--> Environments (Development, Staging, Production)
                |
                +--> Deployments (of Services into Environments)
```
