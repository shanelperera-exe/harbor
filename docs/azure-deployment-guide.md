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

---

## Phase 2: Security & Authentication

### Step 5: Generate Azure Service Principal Credentials
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

### Step 6: Add Repository Secrets
Click **New repository secret** and add the following securely. None of these will be visible in code.

| Name | Value |
|------|-------|
| `AZURE_CREDENTIALS` | Paste the entire JSON block you copied in Step 5. |
| `ACR_USERNAME` | From Step 2 (ACR Access Keys). |
| `ACR_PASSWORD` | From Step 2 (ACR Access Keys). |
| `POSTGRES_PASSWORD` | The password you created for the database in Step 3. |
| `JWT_SECRET` | Generate a random 64-character alphanumeric string. |
| `ADMIN_PASSWORD` | The default password you want for the Harbor Admin account. |
| `SMTP_PASSWORD` | (Optional) Password for your external SMTP provider (e.g. SendGrid). |

### Step 7: Add Repository Variables
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
| `API_GATEWAY_URL` | `https://harbor-api-gateway.<your-default-domain-from-step-4>` |
| `KAFKA_BOOTSTRAP_SERVERS` | (Leave blank or configure if using Azure Event Hubs) |
| `KAFKA_DEPLOYMENT_TOPIC` | `deployments` |
| `SMTP_HOST` | (Optional) e.g., `smtp.sendgrid.net` |
| `SMTP_PORT` | (Optional) e.g., `587` |
| `SMTP_USERNAME` | (Optional) e.g., `apikey` |
| `SMTP_FROM_NAME` | `Harbor System` |
| `SMTP_FROM_EMAIL` | `no-reply@yourdomain.com` |

> **Note on `API_GATEWAY_URL`**: This is critical for the React frontend build. It must match the exact URL that the API Gateway Container App will receive. Because we name the container `harbor-api-gateway`, the URL will always be `https://harbor-api-gateway.<default-domain>`.

---

## Phase 4: Trigger the Deployment

1. With all resources created and Secrets/Variables configured, go to the **Actions** tab in GitHub.
2. Select the **CD Pipeline** workflow on the left.
3. Click **Run workflow** (or simply merge a Pull Request into the `main` or `develop` branch).
4. The pipeline will automatically:
  - Build and push all 8 microservices to your ACR simultaneously.
  - Deploy the 5 Backend APIs as *Internal* apps (hidden from public internet).
  - Deploy the 2 Frontends and 1 API Gateway as *External* apps.
  - Dynamically route the API Gateway to the internal backend APIs over secure HTTPS.

Once the pipeline finishes, you can visit the URLs provided in the Azure Portal under your `harbor-web-ui` and `harbor-admin-ui` Container Apps!
