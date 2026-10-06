# Harbor Azure — Start & Stop Commands

These commands are for stopping the Harbor Azure Container Apps when the system is not being used and restarting them before a demo.

> **Important:** These commands only change replica counts. They do **not** delete the Container Apps, images, Azure Container Apps environment, PostgreSQL database, ACR, domains, or configuration.

---

## 1. Stop Harbor When Not Using It

### Scale all Container Apps to zero

```bash
RG="rg-harbor-centralindia"

for app in \
  harbor-web-ui \
  harbor-admin-ui \
  harbor-api-gateway \
  harbor-auth-api \
  harbor-project-api \
  harbor-env-api \
  harbor-deploy-api \
  harbor-report-api \
  harbor-redis
do
  echo "Scaling $app to 0..."
  az containerapp update \
    --name "$app" \
    --resource-group "$RG" \
    --min-replicas 0 \
    --max-replicas 1 \
    --output none
done

echo "Harbor scaled down."
```

### Apps being stopped

```text
harbor-web-ui
harbor-admin-ui
harbor-api-gateway

harbor-auth-api
harbor-project-api
harbor-env-api
harbor-deploy-api
harbor-report-api

harbor-redis
```

---

## 2. Verify Harbor Is Down

```bash
RG="rg-harbor-centralindia"

for app in \
  harbor-web-ui \
  harbor-admin-ui \
  harbor-api-gateway \
  harbor-auth-api \
  harbor-project-api \
  harbor-env-api \
  harbor-deploy-api \
  harbor-report-api \
  harbor-redis
do
  echo "=== $app ==="
  az containerapp replica list \
    --name "$app" \
    --resource-group "$RG" \
    --query "[].{Name:name,State:properties.runningState}" \
    -o table
done
```

The apps should have no running replicas after they have finished scaling down.

---

# 3. Restart Harbor Before the Demo

Start the components in this order:

```text
Redis
  ↓
Backend APIs
  ↓
API Gateway
  ↓
Frontend applications
```

---

## 3.1 Start Redis First

```bash
az containerapp update \
  --name harbor-redis \
  --resource-group rg-harbor-centralindia \
  --min-replicas 1 \
  --max-replicas 1
```

Check Redis:

```bash
az containerapp replica list \
  --name harbor-redis \
  --resource-group rg-harbor-centralindia \
  -o table
```

Then test Redis:

```bash
az containerapp exec \
  --name harbor-redis \
  --resource-group rg-harbor-centralindia \
  --command "redis-cli PING"
```

Expected:

```text
PONG
```

---

# 3.2 Start the Backend APIs

```bash
RG="rg-harbor-centralindia"

for app in \
  harbor-auth-api \
  harbor-project-api \
  harbor-env-api \
  harbor-deploy-api \
  harbor-report-api
do
  echo "Starting $app..."
  az containerapp update \
    --name "$app" \
    --resource-group "$RG" \
    --min-replicas 1 \
    --max-replicas 1 \
    --output none
done
```

---

# 3.3 Start the API Gateway

```bash
az containerapp update \
  --name harbor-api-gateway \
  --resource-group rg-harbor-centralindia \
  --min-replicas 1 \
  --max-replicas 1
```

---

# 3.4 Start the Frontends

```bash
for app in harbor-web-ui harbor-admin-ui
do
  echo "Starting $app..."
  az containerapp update \
    --name "$app" \
    --resource-group "$RG" \
    --min-replicas 1 \
    --max-replicas 1 \
    --output none
done
```

---

# 4. Verify the Entire System

```bash
RG="rg-harbor-centralindia"

for app in \
  harbor-web-ui \
  harbor-admin-ui \
  harbor-api-gateway \
  harbor-auth-api \
  harbor-project-api \
  harbor-env-api \
  harbor-deploy-api \
  harbor-report-api \
  harbor-redis
do
  echo "=== $app ==="
  az containerapp replica list \
    --name "$app" \
    --resource-group "$RG" \
    --query "[].{Name:name,State:properties.runningState}" \
    -o table
done
```

All nine Container Apps should have a running replica.

---

# 5. Test the Public URLs

### Main Harbor

```bash
curl -I https://harborapp.tech
```

Expected:

```text
HTTP/2 200
```

### Admin Portal

```bash
curl -I https://admin.harborapp.tech
```

Expected:

```text
HTTP/2 200
```

### API Gateway

```bash
curl -i https://api.harborapp.tech/api/auth/login
```

A:

```text
HTTP/2 405
```

is expected because the login endpoint requires `POST`.

---

# 6. Verify Redis Caching Before the Demo

After logging into Harbor and using the application, check the Redis database size:

```bash
az containerapp exec \
  --name harbor-redis \
  --resource-group rg-harbor-centralindia \
  --command "redis-cli DBSIZE"
```

Then list the cache keys:

```bash
az containerapp exec \
  --name harbor-redis \
  --resource-group rg-harbor-centralindia \
  --command "redis-cli --scan"
```

Example:

```text
"harbor:proj:owner:2"
"harbor:auth:user:2"
"harbor:svc:proj:1"
```

These demonstrate that Harbor is actually writing cache entries to Redis.

---

# 7. After the Demo

When you're finished using Harbor, scale everything back to zero:

```bash
RG="rg-harbor-centralindia"

for app in \
  harbor-web-ui \
  harbor-admin-ui \
  harbor-api-gateway \
  harbor-auth-api \
  harbor-project-api \
  harbor-env-api \
  harbor-deploy-api \
  harbor-report-api \
  harbor-redis
do
  echo "Scaling $app to 0..."
  az containerapp update \
    --name "$app" \
    --resource-group "$RG" \
    --min-replicas 0 \
    --max-replicas 1 \
    --output none
done

echo "Harbor scaled down."
```

---

## Important Notes

* **Do not delete** the Container Apps.
* **Do not delete** `harbor-env-prod`.
* **Do not delete** the ACR.
* **Do not delete** PostgreSQL.
* **Do not delete** the Cloudflare DNS configuration.
* **Do not modify** the GitHub Actions workflow just to stop/start the system.
* Redis is cache-only, so cached data can disappear when Redis is stopped. The application will recreate cache entries as users access the system.
* Redis should remain at **1 replica during the demo**.
* The backend APIs can normally be configured for `min-replicas 0` after the demo if cost saving is the priority.
