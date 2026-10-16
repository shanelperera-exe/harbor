# Selenium E2E Test Automation Strategy

## 1. Overview & Purpose
This document defines the architecture, design patterns, tooling, and execution strategy for End-to-End (E2E) automated browser testing for the Harbor platform.

The primary objective of E2E testing in Harbor is to validate complete, integrated user workflows from the browser interface (`harbor-web`, `harbor-admin`) through the API Gateway down to the database and event brokers, ensuring the application behaves predictably from an end-user perspective.

---

## 2. Selenium Automation Architecture

Harbor implements automated E2E testing in C# within the `tests/Harbor.E2ETests` project:

```text
tests/Harbor.E2ETests/
├── BaseTest.cs                     <-- Driver initialization, options, lifecycle & teardown
├── Configuration/                  <-- AppSettings, baseUrl, timeouts
├── Pages/                          <-- Page Object Model (POM) element mappings & interactions
│   ├── LoginPage.cs
│   ├── CreateAccountPage.cs
│   ├── ProjectsPage.cs
│   ├── CreateProjectPage.cs
│   ├── ProjectEnvironmentsPage.cs
│   ├── EnvironmentConfigurationPage.cs
│   ├── DeploymentsPage.cs
│   ├── DeploymentReportPage.cs
│   └── NotificationPage.cs
└── Tests/                          <-- xUnit E2E test scenarios
    ├── AuthTests.cs
    ├── EnvironmentsTests.cs
    ├── EnvironmentConfigurationTests.cs
    ├── DeploymentsTests.cs
    ├── DeploymentReportTests.cs
    └── NotificationTests.cs
```

### 2.1 Technology Stack
- **Language**: C# on .NET 10 SDK
- **Test Framework**: xUnit (`2.9.3`)
- **Browser Automation**: `Selenium.WebDriver` (`4.28.0`)
- **Driver Management**: `Selenium.WebDriver.ChromeDriver` (Automated driver resolution)
- **Assertions**: FluentAssertions (`7.1.0`)

---

## 3. Browser Strategy & Test Environment
- **Target Browsers**: Google Chrome (Primary), Headless Chrome for CI/CD runs.
- **Headless Mode**: Configurable via `BaseTest.cs` using ChromeOptions (`--headless=new`, `--no-sandbox`, `--disable-dev-shm-usage`, `--window-size=1920,1080`).
- **Target Base URL**: `http://localhost:5173` (Local Dev / Staging container).
- **Explicit Waits**: Implemented via `WebDriverWait` with standard 10-second condition timeouts to eliminate flaky tests caused by asynchronous UI rendering.

---

## 4. Page Object Model (POM) Design Pattern

All browser interactions are strictly isolated within Page Objects under `Pages/`:
- Tests never contain raw XPath or CSS selector queries.
- UI elements are defined as properties with explicit wait encapsulation.
- Page actions return next-page instances (e.g. `loginPage.LoginAs(user, pass)` returns `ProjectsPage`).

---

## 5. Execution Workflow

### Local Execution:
```bash
# Ensure frontend and backend are active
docker compose up -d

# Execute Selenium E2E test suite
dotnet test tests/Harbor.E2ETests/Harbor.E2ETests.csproj
```

### Test Artifacts & Diagnostics:
- Automatic screenshots are captured and persisted upon test failure under `tests/Harbor.E2ETests/TestResults/Screenshots/`.
