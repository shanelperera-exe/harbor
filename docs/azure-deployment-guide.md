# Harbor Microservices - Azure Container Apps Deployment Guide

**Target Audience:** DevOps Engineer / Cloud Administrator
**Target Cloud:** Microsoft Azure (Student Subscription / Budget Conscious)
**Target Region:** Central India

This document provides a complete, step-by-step guide to provisioning the necessary Azure infrastructure and configuring GitHub Actions to deploy the Harbor Microservices architecture to Azure Container Apps (ACA).

---

## Prerequisites
- Access to the [Azure Portal](https://portal.azure.com)
- Access to the GitHub Repository Settings (to configure Secrets)
- Azure Cloud Shell (accessible via the `>_` icon in the top right of the Azure Portal)

---

## Phase 1: Azure Resource Provisioning

All resources must be created in the exact region (`Central India`) and within the same Resource Group to minimize latency and bandwidth costs.

### Step 1: Create the Resource Group
1. In the Azure Portal, search for **Resource groups**.
2. Click **Create**.
3. **Resource group**: `rg-harbor-centralindia`
4. **Region**: `Central India`
5. Click **Review + create** -> **Create**.

### Step 2: Provision Azure Container Registry (ACR)
1. Search for **Container registries** and click **Create**.
2. **Resource group**: `rg-harbor-centralindia`
3. **Registry name**: `acrharbor<yourname>` (must be globally unique, no dashes/spaces).
4. **Location**: `Central India`
5. **SKU**: `Basic` (Cheapest tier, perfectly fine for this project).
6. Click **Review + create** -> **Create**.
7. **CRITICAL ACTION**: Once created, go to the resource. In the left menu, click **Access keys**. Toggle **Admin user** to **Enabled**. Note down the `Username` and `password` for later.

### Step 3: Provision Database (PostgreSQL Flexible Server)
1. Search for **Azure Database for PostgreSQL flexible servers** and click **Create**.
2. **Resource group**: `rg-harbor-centralindia`
3. **Server name**: `harbor-db-<yourname>`
4. **Region**: `Central India`
5. **Workload type**: `Development` (keeps costs low).
6. **Compute + storage**: Click *Configure server* -> Select **Burstable** -> Select **Standard_B1ms** (1 vCore, 2 GiB RAM).
7. **Authentication**: PostgreSQL authentication only.
8. Create an **Admin username** and **Password**. Save these securely.
9. Click **Next: Networking**.
  - Select **Allow public access from any Azure service within Azure to this server** (This allows your Container Apps to connect to it without complex VNet injection).
10. Click **Review + create** -> **Create**.
11. **CRITICAL ACTION**: Once created, go to the resource. In the left menu under Settings, click **Databases**. Click **Add**, type `harbor_db`, and save.

### Step 4: Provision Azure Container Apps Environment
1. Search for **Container Apps Environments** and click **Create**.
2. **Resource group**: `rg-harbor-centralindia`
3. **Environment name**: `harbor-env`
4. **Region**: `Central India`
5. **Workload profiles**: Choose **Consumption** (Pay-as-you-go, features a generous free tier).
6. Click **Review + create** -> **Create**.
7. **CRITICAL ACTION**: Once created, go to the resource. On the Overview page, locate the **Default domain** (e.g., `ambitioussea-12345678.centralindia.azurecontainerapps.io`). Copy this domain, you will need it for the frontend configuration.

### Step 5: Provision Azure Event Hubs (Kafka-compatible broker)

Harbor's `Harbor.Deployment` service publishes `DeploymentLifecycleEvent` messages to Kafka and consumes from the same stream to reconcile deployment status. On Azure, the broker is **Azure Event Hubs**, which exposes a Kafka-compatible endpoint that the existing `Confluent.Kafka` client talks to natively — no code changes required. You do **not** run a Kafka broker inside Azure Container Apps.

> **CRITICAL: you must use the Standard tier.** The **Basic** tier does *not* support the Apache Kafka protocol at all (it is AMQP only), so a `Confluent.Kafka` producer/consumer cannot connect to it. Basic also allows only **1 consumer group per event hub** and 1-day retention. Use **Standard, 1 throughput unit**, which is the smallest billable Kafka-capable configuration.

#### Portal walkthrough

1. Search for **Event Hubs** and click **Create**.
2. **Resource group**: `rg-harbor-centralindia`
3. **Namespace name**: `harbor-eventhubs-<yourname>` (globally unique, 6-50 chars, letters/numbers/hyphens).
4. **Region**: `Central India`
5. **Pricing tier**: **Standard**
6. **Throughput units**: **1** (1 MB/s ingress, 1,000 events/s — far more than a demo workload).
7. Click **Review + create** -> **Create**.

#### Create the event hub (the topic)

An Event Hubs *event hub* is the Kafka equivalent of a *topic*, and it must exist before any client publishes — Event Hubs does not auto-create topics. `Harbor.Deployment` publishes to `deployment-events`, so name the hub exactly that.

1. Open the `harbor-eventhubs-<yourname>` namespace -> left menu -> **Event Hubs** -> **+ Create eventhub**.
2. **Name**: `deployment-events`
3. **Partition count**: **1** (partition count is immutable on Standard tier, and 1 is all a low-volume workload needs; partitions are not billed).
4. **Event retention**: **1 day** (minimum on Standard is 1 hour, maximum 7 days).
5. **Capture**: **Off** (billed per hour on Standard; not needed unless you want to archive to Blob Storage).
6. Click **Create**.

#### Create a shared access policy scoped to the event hub

Do not use the namespace-level `RootManageSharedAccessKey` for application traffic — it grants Manage rights on the whole namespace. Create a least-privilege policy on the event hub instead.

1. Select the `deployment-events` event hub -> **Authorization rules (Manage)** -> **+ Create**.
2. **Name**: `harbor-kafka-policy`
3. **Rights**: tick **Send**, **Receive**, and **Listen** (Leave **Manage** unticked).
4. Click **Create**.
5. **CRITICAL ACTION**: Select the rule you just created and copy the **Connection string** value.

#### Verify the connection string shape

The CD pipeline passes this value to the app as the `KAFKA_CONNECTION_STRING` secret, and `KafkaOptions.ApplyConnectionString()` (`src/backend/Harbor.Deployment/Kafka/KafkaOptions.cs:29`) parses it into client settings:

```text
Endpoint=sb://harbor-eventhubs-<yourname>.servicebus.windows.net/;SharedAccessKeyName=harbor-kafka-policy;SharedAccessKey=<base64 key>;EntityPath=deployment-events
```

| Connection string field | Parsed into | Value used |
|-------------------------|--------------|------------|
| `Endpoint` | `BootstrapServers` | `harbor-eventhubs-<yourname>.servicebus.windows.net:9093` |
| `SharedAccessKeyName` | `SaslUsername` | `harbor-kafka-policy` |
| `SharedAccessKey` | `SaslPassword` | the policy key |
| `EntityPath` | `DeploymentTopic` | `deployment-events` |
| _(forced)_ | `SecurityProtocol` / `SaslMechanism` | `SaslSsl` / `Plain` |

**`EntityPath` is required.** If it is missing, `DeploymentTopic` stays empty and the producer silently no-ops (`KafkaProducerService.PublishDeploymentEventAsync` returns early) and the hosted consumer logs "Kafka configuration is incomplete" and exits. Because the topic name is taken from `EntityPath`, it must match the event hub name exactly.

#### Equivalent CLI commands (Azure Cloud Shell, Bash)

```bash
# 1. Namespace on the Kafka-capable Standard tier
az eventhubs namespace create \
  --name harbor-eventhubs-<yourname> \
  --resource-group rg-harbor-centralindia \
  --location centralindia \
  --sku Standard \
  --capacity 1 \
  --minimum-tls-version 1.2 \
  --public-network-access Enabled

# 2. Event hub (topic), named to match KAFKA_DEPLOYMENT_TOPIC
az eventhubs eventhub create \
  --namespace-name harbor-eventhubs-<yourname> \
  --resource-group rg-harbor-centralindia \
  --name deployment-events \
  --partition-count 1 \
  --message-retention 1d \
  --capture-status Off

# 3. Least-privilege policy: Send + Receive, no Manage
az eventhubs eventhub authorization-rule create \
  --namespace-name harbor-eventhubs-<yourname> \
  --eventhub-name deployment-events \
  --resource-group rg-harbor-centralindia \
  --name harbor-kafka-policy \
  --rights Send Receive Listen \
  --no-output

# 4. Build the entity-scoped connection string
NS="harbor-eventhubs-<yourname>.servicebus.windows.net"
POLICY="harbor-kafka-policy"
KEY=$(az eventhubs eventhub authorization-rule keys list \
  --namespace-name harbor-eventhubs-<yourname> \
  --eventhub-name deployment-events \
  --resource-group rg-harbor-centralindia \
  --name harbor-kafka-policy \
  --query primaryKey -o tsv)
echo "Endpoint=sb://${NS}/;SharedAccessKeyName=${POLICY};SharedAccessKey=${KEY};EntityPath=deployment-events"
```

#### Networking

The Kafka endpoint is `*.servicebus.windows.net:9093` on the public internet, and the consumption-only Container Apps environment has outbound connectivity by default, so **no VNet or firewall change is needed**. If you later enable VNet injection on `harbor-env`, you must allow outbound TCP 9093 to `harbor-eventhubs-<yourname>.servicebus.windows.net` (and inbound on 5672/443 if you ever use the AMQP endpoint).

---

## Phase 2: Security & Authentication

### Step 6: Generate Azure Service Principal Credentials
GitHub Actions needs permission to deploy resources to your Resource Group.

1. Open the **Azure Cloud Shell** in the Azure Portal (the `>_` icon at the top right). Select **Bash**.
2. Run the following command. **Replace `<your-subscription-id>`** with your actual Azure Subscription ID:
   ```bash
   az ad sp create-for-rbac --name "harbor-aca-deploy" --role contributor \
     --scopes /subscriptions/<your-subscription-id>/resourceGroups/rg-harbor-centralindia \
     --sdk-auth
   ```
3. The terminal will output a block of JSON. **Copy the ENTIRE JSON block** (including the `{ }` brackets).

---

## Phase 3: GitHub Actions Configuration

Go to your project's GitHub Repository. Click **Settings** -> **Secrets and variables** -> **Actions**.

### Step 7: Add Repository Secrets
Click **New repository secret** and add the following securely. None of these will be visible in code.

| Name | Value |
|------|-------|
| `AZURE_CREDENTIALS` | Paste the entire JSON block you copied in Step 6. |
| `ACR_USERNAME` | From Step 2 (ACR Access Keys). |
| `ACR_PASSWORD` | From Step 2 (ACR Access Keys). |
| `POSTGRES_PASSWORD` | The password you created for the database in Step 3. |
| `JWT_SECRET` | Generate a random 64-character alphanumeric string. |
| `ADMIN_PASSWORD` | The default password you want for the Harbor Admin account. |
| `KAFKA_CONNECTION_STRING` | From Step 5. Must include `;EntityPath=deployment-events`. |
| `SMTP_PASSWORD` | (Optional) Password for your external SMTP provider (e.g. SendGrid). |

### Step 8: Add Repository Variables
Switch to the **Variables** tab (next to Secrets). Click **New repository variable**.

| Name | Value |
|------|-------|
| `ACR_LOGIN_SERVER` | `<your-acr-name>.azurecr.io` |
| `POSTGRES_SERVER` | `<your-db-server-name>.postgres.database.azure.com` |
| `POSTGRES_USER` | The admin username you created in Step 3. |
| `POSTGRES_DATABASE` | `harbor_db` |
| `POSTGRES_PORT` | `5432` |
| `JWT_ISSUER` | `HarborAuth` |
| `JWT_AUDIENCE` | `HarborClients` |
| `ADMIN_EMAIL` | `admin@harbor.local` |
| `KAFKA_DEPLOYMENT_TOPIC` | `deployment-events` — must match the Event Hubs name in Step 5. Only used if `KAFKA_CONNECTION_STRING` is unset. |
| `SMTP_HOST` | (Optional) e.g., `smtp.sendgrid.net` |
| `SMTP_PORT` | (Optional) e.g., `587` |
| `SMTP_USERNAME` | (Optional) e.g., `apikey` |
| `SMTP_FROM_NAME` | `Harbor System` |
| `SMTP_FROM_EMAIL` | `no-reply@yourdomain.com` |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID |
| `GH_APP_ID` | Numeric App ID from your GitHub App settings page |
| `GH_APP_CLIENT_ID` | Client ID from the same page |
| `GH_APP_SLUG` | The app's URL slug, e.g. `my-harbor-app` |
| `GH_API_BASE_URL` | `https://api.github.com/` |

Add these as **repository secrets** as well:

| Name | Value |
|------|-------|
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GH_APP_CLIENT_SECRET` | GitHub App client secret |
| `GH_APP_PRIVATE_KEY_BASE64` | The downloaded `.pem` private key, Base64-encoded (see below) |
| `GH_APP_WEBHOOK_SECRET` | The single webhook secret for the whole app. Used both to verify inbound GitHub deliveries and as the HMAC key Harbor signs its own status callbacks with. Set the same value on the GitHub App's webhook configuration. |
| `ENVIRONMENT_SECRETS_KEY` | 32-byte key, Base64-encoded, used by `Harbor.Environment` to encrypt stored secret values |

> There is deliberately only one webhook secret. `GitHubAppOptionsSetup` and `DeploymentsController` both read `GH_APP_WEBHOOK_SECRET`, so rotating it changes both trust paths at once. If it is unset, inbound webhooks and Harbor's own `POST /api/deployments/{id}/status` callback both return 401.

To generate the GitHub App private key value:

```bash
base64 -w 0 private-key.pem
```

```bash
openssl rand -base64 32
```

#### URLs the CD workflow derives for you

These are **not** repository variables. The workflow reads the Container Apps environment's default domain (Step 4) and constructs them, because a Container App FQDN is always `{appName}.{envDefaultDomain}`:

| Value | Derived as | Used by |
|-------|-----------|---------|
| `API_GATEWAY_URL` | `https://harbor-api-gateway.<default-domain>` | OAuth `redirect_uri` origin, GitHub App OAuth origin |
| `AUTH_SERVICE_URL` | `https://harbor-auth-api.<default-domain>`, read from Azure | `Harbor.Deployment` → `Harbor.Authentication` internal call |
| `FRONTEND_URL` | `https://harbor-web-ui.<default-domain>` | Post-auth and GitHub-install redirect targets |
| `ALLOWED_ORIGINS` | `https://harbor-admin-ui.<default-domain>,https://harbor-web-ui.<default-domain>` | Gateway CORS allowlist |
| `VITE_API_BASE_URL` | `{API_GATEWAY_URL}/api` | Baked into both React bundles at build time |
| `VITE_GITHUB_APP_SLUG` | `${{ vars.GH_APP_SLUG }}` | Baked into the web bundle; the "Install GitHub App" link |

#### Internal service-to-service traffic

The gateway and the backend APIs call each other over **HTTPS using the FQDN that Azure reports for
each app**, read at deploy time:

```bash
az containerapp show -n harbor-auth-api -g rg-harbor-centralindia \
  --query properties.configuration.ingress.fqdn -o tsv
```

Do not construct this name by hand. Two earlier attempts both failed, each in a different way:

| Attempt | Result |
|---|---|
| `http://harbor-auth-api` (short name) | `Name or service not known` — the short name does not resolve from another container app. Microsoft notes this path relies on a sidecar with known unreliability and advises using the FQDN. |
| `https://harbor-auth-api.internal.<default-domain>` | `RemoteCertificateNameMismatch` — resolves and connects, but the environment certificate is issued for the non-internal name, so TLS name validation fails and the gateway returns 502. |

The reported FQDN matches the environment's certificate, and because the backend apps use **internal**
ingress they remain unreachable from outside the environment. The CD workflow reads the FQDN for each
app rather than assembling it, so it cannot drift from what Azure actually issued.

Every hop is therefore `https://`, and ACA's proxy sets `X-Forwarded-Proto: https` on the way to the
container, so each backend's `UseForwardedHeaders()` recovers an HTTPS scheme and
`UseHttpsRedirection()` is a no-op. A destination left on `http://` is what breaks this: ACA reports
`X-Forwarded-Proto: http`, the backend answers `301` to `https://<backend-fqdn><path>`, and the
browser follows it straight past the gateway to the backend origin, where CORS then fails. The
workflow's verification step fails the deploy if any destination is not an `https://` FQDN.

GitHub sign-in uses a **GitHub App** (PKCE flow via `GitHubAppOAuthClient`), not a separate GitHub OAuth app, so there is no `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET` to register and no callback URL to pre-register with GitHub. Only Google needs an external OAuth application:

```text
Authorized redirect URI:
  https://harbor-api-gateway.<default-domain>/api/auth/external/google/callback
```

For Google **Authorized JavaScript origins**, add both frontends:

```text
https://harbor-web-ui.<default-domain>
https://harbor-admin-ui.<default-domain>
```

---

## Phase 4: Trigger the Deployment

1. With all resources created and Secrets/Variables configured, go to the **Actions** tab in GitHub.
2. Select the **CD Pipeline** workflow on the left.
3. Click **Run workflow** (or simply merge a Pull Request into the `main` or `develop` branch).
4. The pipeline runs in a strict order, because each stage depends on the URLs the previous one created:

   ```text
   ┌─ harbor-auth-api
   ├─ harbor-project-api
   ├─ harbor-env-api
   ├─ harbor-deploy-api          (5 backend APIs in parallel)
   └─ harbor-report-api
             │
             ▼
      harbor-api-gateway         (reads the backend internal FQDNs)
             │
             ▼  (gateway FQDN read back from Azure)
   ┌─ harbor-admin-ui            (2 frontends in parallel)
   └─ harbor-web-ui
   ```

   - The 5 Backend APIs are deployed as *Internal* apps (hidden from the public internet).
   - The API Gateway is deployed next, with its reverse-proxy destinations and CORS allowlist
     set **at creation time**, so its first revision never serves the compose defaults.
   - The 2 Frontends are built and deployed last, with the gateway origin baked into the bundle
     via `VITE_API_BASE_URL`.
   - Every app is pinned to `--min-replicas 0 --max-replicas 1 --cpu 0.5 --memory 1Gi` so a
     burst cannot scale out and consume your budget. `min-replicas 0` means nothing is billed
     while the app is idle; the 0.5 vCPU / 1 GiB allocation only bills while a replica is
     running. Drop to `--cpu 0.25 --memory 0.5Gi` later if you find the .NET services fit.

Once the pipeline finishes, you can visit the URLs provided in the Azure Portal under your `harbor-web-ui` and `harbor-admin-ui` Container Apps!

---

## Phase 5: Verifying the Kafka Integration

### Step 9: Confirm the producer connected

Open **harbor-deploy-api** in the Azure Portal -> **Log streams** (or run the following in Cloud Shell):

```bash
az containerapp logs show \
  --name harbor-deploy-api \
  --resource-group rg-harbor-centralindia \
  --follow
```

A healthy start-up contains these lines, in this order:

```text
Kafka producer configured with SASL/SaslSsl
Kafka producer initialized with servers: harbor-eventhubs-<yourname>.servicebus.windows.net:9093
Kafka consumer configured with SASL/SaslSsl
KafkaConsumerService started for topic deployment-events and group harbor-deployment-group
```

If you instead see `Kafka BootstrapServers is not configured` or `Kafka configuration is incomplete`, the `KAFKA_CONNECTION_STRING` secret is empty or missing its `EntityPath` segment. Re-add the secret in Step 7 and re-run the CD pipeline — the value is baked into the Container App's environment at deploy time, so a redeploy (not just a secret edit) is required.

### Step 10: Confirm events are landing in Event Hubs

Trigger a deployment from the Harbor admin UI, then check the namespace:

```bash
# Message count for the event hub
az eventhubs eventhub show \
  --namespace-name harbor-eventhubs-<yourname> \
  --eventhub-name deployment-events \
  --resource-group rg-harbor-centralindia \
  --query '{count:messageCount, partitions:partitionCount}' -o tsv
```

In the Portal: **Event Hubs** -> **harbor-eventhubs-<yourname>** -> **deployment-events** -> **Event Hubs Explorer**. Pick a partition and load recent events; each one is a `DeploymentLifecycleEvent` JSON document with `DeploymentId`, `Status`, and `FailureReason`. The partition should increment on every deployment status change.

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `KafkaError{code=ALL_BROKERS_DOWN}` or `SASL authentication failed` | Namespace is on the **Basic** tier, which has no Kafka endpoint | Recreate the namespace as **Standard, 1 TU** |
| `UnknownTopicOrPartition` | Event hub name does not match the `EntityPath` in the connection string | Rename the hub to `deployment-events`, or fix `EntityPath` |
| `Kafka configuration is incomplete`, consumer exits silently | `EntityPath` missing from the connection string, so `DeploymentTopic` is empty | Add `;EntityPath=deployment-events` and redeploy |
| `SASL authentication failed` with a Basic/Standard namespace that looks right | Policy has **Manage** only, or the wrong policy name is in `SharedAccessKeyName` | Recreate the policy with **Send, Receive, Listen** and re-copy the key |
| `Connection refused` / timeout on port 9093 | VNet injection enabled on `harbor-env` without an outbound rule for 9093 | Add an outbound rule to `*.servicebus.windows.net:9093`, or remove VNet injection |
| Events publish but status never advances | Consumer is in a different consumer group than the producer expects, or offset reset is `Latest` and it started after the event | Confirm group `harbor-deployment-group`; set `KAFKA_AUTO_OFFSET_RESET=Earliest` for backfill runs |
| Works locally, not on Azure | Local dev used `KAFKA_BOOTSTRAP_SERVERS` (plaintext); Azure needs SASL/SSL | Ensure `KAFKA_CONNECTION_STRING` is set — the connection string takes priority and forces `SaslSsl`/`Plain` |

### Cost note

Event Hubs Standard bills the **1 throughput unit hourly** (1 MB/s ingress, 1,000 events/s, 84 GB of retention storage) plus a small per-million-events ingress charge. Partitions are not billed, and turning Capture on adds a per-hour charge, so leave it **Off** for this workload. To stop all Kafka cost while keeping the app running, scale the namespace capacity to its minimum or delete it — `Harbor.Deployment` degrades gracefully, logging a warning and continuing to serve API traffic when Kafka is unreachable.
