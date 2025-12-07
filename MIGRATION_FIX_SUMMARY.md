# Migration Fix Summary

## Problem
Your Kubernetes deployment was missing the `saved_images` table, causing the error:
```
Failed to load saved images: Error: 42P01: relation "saved_images" does not exist
```

## Root Cause
Migrations weren't being applied before the API started in Kubernetes, even though the migration files existed locally.

## Solution Implemented

### 1. **Init Container Pattern**
Updated `Kubernetes/api-dep.yaml` to use an init container that:
- Runs migrations before the main API container starts
- Only starts the API after migrations complete successfully
- Automatically retries if the database is temporarily unavailable

### 2. **Program.cs Updates**
- Added `--migrate-only` flag support to run only migrations and exit
- Conditional service registration to avoid errors during migration-only mode
- Proper exit codes: `Environment.Exit(1)` on failure, graceful `return` on success

### 3. **New Kubernetes Job (Optional)**
Created `Kubernetes/migrations-job.yaml` for manual/scheduled migration runs outside of deployments.

## Files Modified

| File | Changes |
|------|---------|
| `AgentApi/Program.cs` | Added migration-only mode with conditional service registration |
| `Kubernetes/api-dep.yaml` | Added init container for automatic migrations |
| `Kubernetes/migrations-job.yaml` | NEW: Optional standalone migration job |
| `KUBERNETES_MIGRATIONS_GUIDE.md` | NEW: Comprehensive guide for setup and troubleshooting |

## Deployment Steps

### Quick Deploy
```powershell
# 1. Rebuild image with latest migrations
docker build -t nhowell02/agentserver:latest .
docker push nhowell02/agentserver:latest

# 2. Deploy to Kubernetes
kubectl apply -f Kubernetes/api-dep.yaml

# 3. Watch migration logs
kubectl logs -n nate-agent deployment/api-deployment -c migrations --follow
```

### Verify Success
```powershell
# Should see migration logs like:
# "Database connection successful!"
# "Applying 3 pending migrations..."
# "Migrations applied successfully."
```

## Testing Locally
Your existing docker-compose.yaml already applies migrations automatically:
```powershell
docker compose down -v
docker compose up --build

# API will automatically apply all migrations on startup
```

## What Happens Now

1. **Pod starts** → Init container runs `dotnet AgentApi.dll --migrate-only`
2. **Init applies migrations** → Creates `saved_images` table and others
3. **Init completes** → Main API container starts
4. **API ready** → Frontend can call `/api/images/saved` successfully

## If Migrations Fail

```powershell
# Check init container logs
kubectl logs -n nate-agent deployment/api-deployment -c migrations --previous

# Verify database connection
kubectl get pods -n nate-agent
kubectl logs -n nate-agent deployment/postgres

# Verify secrets
kubectl get secrets -n nate-agent nate-agent-secrets -o yaml
```

## Next Steps

1. **Rebuild and push your Docker image** (critical!)
2. **Redeploy to Kubernetes** with updated image
3. **Verify migrations** using kubectl logs
4. **Test the /api/images/saved endpoint**

See `KUBERNETES_MIGRATIONS_GUIDE.md` for comprehensive documentation.
