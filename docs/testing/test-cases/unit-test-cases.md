# Harbor Unit Test Cases Specification

## 1. Strategy & Objectives
Unit testing in Harbor validates that individual components, services, domain algorithms, security filters, and controllers function deterministically in strict isolation.

### Key Principles
- **Test Isolation**: All external dependencies (databases, network sockets, file I/O, external APIs) are substituted with mocks using **Moq** or test stubs.
- **Coverage Expectation**: Minimum 80% line coverage threshold across all assemblies (Achieved: **94.6%** line coverage, **95.9%** method coverage).
- **Execution Speed**: Full unit test suite executes in < 15 seconds on local developer machines.
- **Defensive Edge Testing**: Explicit verification of null inputs, empty collections, malformed IDs, expired tokens, and boundary conditions.

---

## 2. Unit Test Assemblies & Scopes

| Test Project | Target Assembly | Coverage | Test Categories |
|:---|:---|:---:|:---|
| `Harbor.Common.Tests` | `Harbor.Common` | **100.0%** | Security crypto, correlation ID enrichment, RFC 7807 problem details, sensitive log scrubbers, health checks. |
| `Harbor.Caching.Tests` | `Harbor.Caching` | **100.0%** | Redis key hashing, sliding/absolute TTL, JSON serialization, token blacklist middleware. |
| `Harbor.GitHub.Tests` | `Harbor.GitHub` | **100.0%** | GitHub App JWT RS256 signing, installation token resolution, OAuth client exchange, options configuration. |
| `Harbor.Deployment.Tests` | `Harbor.Deployment` | **95.5%** | Deployment state machine, webhook receiver, log sanitization, URL extraction, GitHub Actions client, dashboard metrics. |
| `Harbor.Authentication.Tests` | `Harbor.Authentication` | **93.4%** | Registration, BCrypt password hashing, JWT claims generation, refresh tokens, role checks, admin user management. |
| `Harbor.Project.Tests` | `Harbor.Project` | **92.1%** | Project CRUD, service definitions, GitHub repository/branch/commit proxies, custom domain DNS verification. |
| `Harbor.Environment.Tests` | `Harbor.Environment` | **87.3%** | Environment tiers, deactivation guards, AES-256-GCM encrypted secrets, configuration key validation. |
| `Harbor.Reporting.Tests` | `Harbor.Reporting` | **97.3%** | Cross-service report queries, audit log retrieval, 8 multi-cloud log adapters, SignalR hub connection tracking. |

---

## 3. Representative Unit Test Case Specifications

### 3.1 Harbor.Deployment — Log Sanitization & URL Extraction
- **Test Case ID**: `TC-UNIT-DEP-001`
  - **Target Class**: `DeploymentLogSanitizer`
  - **Scenario**: Ingested log string contains GitHub Personal Access Token (`ghp_...`) and database password.
  - **Expected Result**: Secrets replaced with `[REDACTED]`.
  - **Status**: **PASS** (100% method coverage)

- **Test Case ID**: `TC-UNIT-DEP-002`
  - **Target Class**: `DeploymentUrlExtractor`
  - **Scenario**: Raw build log ends with "Application live at https://orders.harborapp.tech".
  - **Expected Result**: Extracts `https://orders.harborapp.tech` as live URL.
  - **Status**: **PASS**

### 3.2 Harbor.Authentication — Password Security & Blacklist
- **Test Case ID**: `TC-UNIT-AUTH-001`
  - **Target Class**: `AuthService`
  - **Scenario**: Register user with 7-character password.
  - **Expected Result**: Throws validation exception; password must be at least 8 characters.
  - **Status**: **PASS**

- **Test Case ID**: `TC-UNIT-AUTH-002`
  - **Target Class**: `TokenBlacklistMiddleware`
  - **Scenario**: Incoming request with valid JWT whose `jti` exists in Redis `blacklist:*`.
  - **Expected Result**: Pipeline short-circuits with `401 Unauthorized`.
  - **Status**: **PASS**

### 3.3 Harbor.Environment — Secrets Protection (AES-256-GCM)
- **Test Case ID**: `TC-UNIT-ENV-001`
  - **Target Class**: `HarborSecretProtector`
  - **Scenario**: Encrypt configuration string with 256-bit key; decrypt ciphertext.
  - **Expected Result**: Decrypted plaintext matches original input identically.
  - **Status**: **PASS**

- **Test Case ID**: `TC-UNIT-ENV-002`
  - **Target Class**: `HarborSecretProtector`
  - **Scenario**: Alter 1 byte of the ciphertext payload before calling decrypt.
  - **Expected Result**: Throws `CryptographicException` (`AuthenticationTagMismatchException`).
  - **Status**: **PASS**

### 3.4 Harbor.Reporting — Multi-Cloud Log Adapters
- **Test Case ID**: `TC-UNIT-REP-001`
  - **Target Class**: `ProviderAdapterFactory`
  - **Scenario**: Request adapter for provider name `"Azure"`, `"Aws"`, `"Gcp"`, `"Docker"`, `"Kubernetes"`, `"Render"`, `"Vercel"`, `"DigitalOcean"`.
  - **Expected Result**: Instantiates corresponding typed log adapter implementing `IProviderLogAdapter`.
  - **Status**: **PASS** (100% coverage across all 8 adapters)

---

## 4. Execution & Verification Command
```bash
# Execute full backend unit test suite
dotnet test tests/unit/ --filter "Category!=Integration" --logger "console;verbosity=normal"
```
