# US-19 Deployment Details and Logs

| ID | Scenario | Expected result | Coverage |
| --- | --- | --- | --- |
| US19-01 | Open a deployment in an accessible project | Project, service, environment, version, commit, deployment author, status, and timestamps are shown. | UI / API |
| US19-02 | Open a deployment with logs | Logs appear in timestamp order and are readable, searchable, and copyable. | UI / Selenium |
| US19-03 | Open a failed deployment | Failure reason and available error logs are shown. | Unit / UI / Selenium |
| US19-04 | Open a deployment with no captured logs | The detail view displays an explicit no-logs state without failing. | UI |
| US19-05 | Request another project's deployment as a regular user | The API returns 404 and does not return deployment metadata or logs. | API |
| US19-06 | Request an accessible deployment as an administrator | The API returns the deployment details. | API |
| US19-07 | Inspect logs or failure text containing credential-like values | Passwords, secret/token/API-key assignments, JSON values, and bearer credentials are replaced with `[REDACTED]`. | Unit / API |

## Execution

Automated checks are maintained in `tests/unit/Harbor.Deployment.Tests`, `tests/integration/Harbor.Deployment.IntegrationTests`, and `tests/Harbor.E2ETests`. Record manual browser/DevOps verification in the sprint test execution report.