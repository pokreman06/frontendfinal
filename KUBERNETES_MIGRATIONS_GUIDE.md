# Kubernetes Database Migrations Guide

## Overview

Your application now uses **init containers** to ensure database migrations are applied before your API starts in Kubernetes. This guarantees that the `saved_images` table (and all other migrations) will be created before requests hit your API.

## How It Works

### Architecture

1. **Init Container (migrations)**: Runs first, applies all pending migrations, then exits
2. **Main Container (api)**: Only starts after the init container completes successfully
3. **Automatic Retry Logic**: Built-in retry mechanism (10 attempts, 2-second intervals) handles temporary database unavailability

### Migration Flow

```
Kubernetes Pod Deployment
    ↓
Init Container: "dotnet AgentApi.dll --migrate-only"
    ↓
    (Applies pending migrations, creates tables like saved_images)
    ↓
Init Container exits (success)
    ↓
Main Container: "dotnet AgentApi.dll" (normal startup)
    ↓
API accepts requests
```

## Changes Made

### 1. Program.cs Updates

**Added migration-only mode support:**
```csharp
// Check if this is a migration-only run (for init containers)
bool migrateOnly = args.Contains("--migrate-only");
```

**Conditional service registration:**
- Services are only registered when NOT in migration-only mode
- This prevents errors from missing environment variables during migration runs

**Exit handling:**
```csharp
if (retryCount >= maxRetries && lastException != null)
{
    Console.WriteLine($"Failed to connect to database after {maxRetries} attempts...");
    Environment.Exit(1);  // Critical: fails the pod if migrations can't run
}

if (migrateOnly)
{
    Console.WriteLine("Migration-only mode: Migrations completed successfully. Exiting.");
    return;  // Exit cleanly after migrations
}
```

### 2. Kubernetes Deployment (api-dep.yaml)

**Added init container section:**
```yaml
initContainers:
  - name: migrations
    image: nhowell02/agentserver:${TAG}
    imagePullPolicy: Always
    command: 
      - /bin/sh
      - -c
      - "dotnet AgentApi.dll --migrate-only"
    env:
      - name: DATABASE_URL
        valueFrom:
          secretKeyRef:
            name: nate-agent-secrets
            key: DATABASE_URL
      - name: ASPNETCORE_ENVIRONMENT
        value: "Production"
      - name: ASPNETCORE_URLS
        value: "http://+:8080"
      - name: DOTNET_RUNNING_IN_CONTAINER
        value: "true"
```

### 3. Optional Job Resource (migrations-job.yaml)

For manual migration runs or CI/CD pipelines:
```yaml
kubectl apply -f Kubernetes/migrations-job.yaml
```

This can be run independently to:
- Test migrations before deployment
- Run migrations on a schedule
- Fix migration issues without redeploying the API

## Deployment Instructions

### Initial Setup

```powershell
# 1. Ensure your Docker image is built with latest migrations
docker build -t nhowell02/agentserver:latest .

# 2. Push the image
docker push nhowell02/agentserver:latest

# 3. Deploy to Kubernetes
kubectl apply -f Kubernetes/api-dep.yaml
```

### Verify Migrations Ran

```powershell
# Check pod logs for migration status
kubectl logs -n nate-agent deployment/api-deployment -c migrations

# Example successful output:
# Database connection successful!
# Applying 3 pending migrations...
#   - 20251207050459_AddSourceMaterials
#   - 20251207010835_AddToolCallsTable
#   - 20251207060715_AddUserEmailToQueryThemesAndSavedImages
# Migrations applied successfully.
# Migration-only mode: Migrations completed successfully. Exiting.
```

### If Migrations Fail

```powershell
# Check init container logs
kubectl logs -n nate-agent deployment/api-deployment -c migrations --previous

# Describe pod to see events
kubectl describe pod -n nate-agent <pod-name>

# Common issues:
# 1. DATABASE_URL not set in secrets - verify secret exists
# 2. Database not ready - check postgres pod status
# 3. Network connectivity - verify postgres service is accessible
```

## Adding New Migrations

When you add new migrations locally:

```powershell
# On your development machine
cd c:\Users\pokre\frontendfinal
dotnet ef migrations add MigrationName --project AgentApi --startup-project AgentApi

# Rebuild your Docker image with the new migration
docker build -t nhowell02/agentserver:v1.2.3 .
docker push nhowell02/agentserver:v1.2.3

# Update TAG environment variable and redeploy
kubectl set image deployment/api-deployment api-deployment=nhowell02/agentserver:v1.2.3 -n nate-agent
```

The init container will automatically detect and apply the new migration.

## Troubleshooting

### "relation saved_images does not exist" Error

**Root Cause**: Migrations weren't applied before the API started.

**Solutions**:

1. **Check if migrations ran:**
   ```powershell
   kubectl logs -n nate-agent deployment/api-deployment -c migrations
   ```

2. **Restart the pod to retry migrations:**
   ```powershell
   kubectl delete pod -n nate-agent -l app=api-deployment
   ```

3. **Check database connectivity:**
   ```powershell
   # Verify postgres is running
   kubectl get pods -n nate-agent -l app=postgres
   
   # Check postgres logs
   kubectl logs -n nate-agent deployment/postgres
   ```

4. **Verify secrets:**
   ```powershell
   kubectl get secrets -n nate-agent nate-agent-secrets -o yaml
   # Ensure DATABASE_URL is set correctly
   ```

### Pod Stuck in Init:0/1

```powershell
# Check init container status
kubectl describe pod -n nate-agent <pod-name>

# Check logs
kubectl logs -n nate-agent <pod-name> -c migrations --tail=50
```

**Common causes:**
- Database not accessible from pod
- Invalid DATABASE_URL format
- Postgres pod not running or not ready

## Advanced: Manual Job-Based Migrations

For more control or CI/CD integration, use the migrations job:

```powershell
# Deploy migrations as a separate job
kubectl apply -f Kubernetes/migrations-job.yaml

# Check job status
kubectl get jobs -n nate-agent

# Check job logs
kubectl logs -n nate-agent -l job-name=db-migrations

# Clean up job after successful completion
kubectl delete job db-migrations -n nate-agent
```

## Best Practices

1. **Always rebuild the Docker image** when adding migrations
2. **Test migrations locally first**:
   ```powershell
   docker compose down -v
   docker compose up --build
   ```

3. **Monitor init container logs** after every deployment:
   ```powershell
   kubectl logs -n nate-agent deployment/api-deployment -c migrations --follow
   ```

4. **Use database backups** before major migrations in production

5. **Tag images semantically**:
   ```powershell
   docker build -t nhowell02/agentserver:v1.2.3 .
   docker build -t nhowell02/agentserver:latest .
   ```

## Environment Variables Reference

For the init container to work, ensure these are set:

| Variable | Purpose | Required |
|----------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `ASPNETCORE_ENVIRONMENT` | Set to "Production" for init container | ✅ Yes |
| `ASPNETCORE_URLS` | Must be "http://+:8080" | ✅ Yes |
| `DOTNET_RUNNING_IN_CONTAINER` | Set to "true" | ✅ Yes |

All other environment variables (GOOGLE_API, MCP_SERVICE_URL, etc.) are **skipped** during migration-only mode.

## Support

If migrations fail:

1. Check `kubectl logs` first
2. Verify database connectivity
3. Ensure secrets are properly configured
4. Review the APPLICATION_LOG for detailed error messages
5. Run migrations manually using the Job resource for debugging

