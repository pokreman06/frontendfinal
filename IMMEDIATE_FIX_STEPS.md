# Immediate Action Plan - Fix the "saved_images" Error

## The Error You're Getting
```
GET https://api.nagent.duckdns.org/api/images/saved 500 (Internal Server Error)
Failed to load saved images: Error: 42P01: relation "saved_images" does not exist
```

## Why This Is Happening
Your Kubernetes deployment doesn't have the init container running migrations yet.

## How to Fix It (Right Now)

### Step 1: Rebuild Your Docker Image
```powershell
cd c:\Users\pokre\frontendfinal

# Build with latest migrations included
docker build -t nhowell02/agentserver:latest .

# Push to registry
docker push nhowell02/agentserver:latest
```

### Step 2: Deploy Updated Configuration
```powershell
# Apply the updated deployment with init container
kubectl apply -f Kubernetes/api-dep.yaml

# Watch for the migration to complete
kubectl logs -n nate-agent deployment/api-deployment -c migrations --follow
```

Expected output:
```
Database connection successful!
Applying 3 pending migrations...
  - 20251207050459_AddSourceMaterials
  - 20251207010835_AddToolCallsTable
  - 20251207060715_AddUserEmailToQueryThemesAndSavedImages
Migrations applied successfully.
Migration-only mode: Migrations completed successfully. Exiting.
```

### Step 3: Verify the Main API Started
```powershell
# Check main container logs
kubectl logs -n nate-agent deployment/api-deployment -c api-deployment --tail 20

# Should see something like:
# "Application started"
# "MCP service URL resolved to: http://mcp-service:8000"
```

### Step 4: Test the Endpoint
```powershell
# Test locally (if you have kubectl port-forward)
kubectl port-forward -n nate-agent svc/api-service 8000:8080

# In another terminal:
curl http://localhost:8000/api/images/saved

# Or just wait a minute and refresh your web application
# The "Failed to load saved images" error should be gone
```

## What Changed in Your Code

### 1. Program.cs - Migration Support
```csharp
bool migrateOnly = args.Contains("--migrate-only");
```
This allows the app to run in migration-only mode and exit after applying migrations.

### 2. Kubernetes - Init Container
```yaml
initContainers:
  - name: migrations
    image: nhowell02/agentserver:${TAG}
    command: 
      - /bin/sh
      - -c
      - "dotnet AgentApi.dll --migrate-only"
    # ... environment variables ...
```
This runs migrations before the API starts.

## Troubleshooting

### Problem: Pod stuck in "Init:0/1"
```powershell
kubectl describe pod -n nate-agent <pod-name>
kubectl logs -n nate-agent <pod-name> -c migrations
```

### Problem: Still getting "relation not found" error
1. Pod might not have fully restarted
   ```powershell
   kubectl delete pod -n nate-agent -l app=api-deployment
   kubectl get pods -n nate-agent  # Wait for new pod to start
   ```

2. Check migrations actually ran:
   ```powershell
   kubectl logs -n nate-agent deployment/api-deployment -c migrations --previous
   ```

3. Verify database is running:
   ```powershell
   kubectl get pods -n nate-agent
   kubectl logs -n nate-agent deployment/postgres
   ```

### Problem: DATABASE_URL secret not found
```powershell
# Verify secret exists
kubectl get secrets -n nate-agent

# Verify it has DATABASE_URL
kubectl get secret -n nate-agent nate-agent-secrets -o jsonpath='{.data.DATABASE_URL}'

# If missing, create/update it:
kubectl create secret generic nate-agent-secrets \
  --from-literal=DATABASE_URL='postgres://...' \
  -n nate-agent --dry-run=client -o yaml | kubectl apply -f -
```

## Expected Timeline

| Step | Duration | What Happens |
|------|----------|-------------|
| `kubectl apply` | Immediate | Pod creation starts |
| Init container | 5-30 seconds | Migrations apply to database |
| Main container startup | 5-10 seconds | API initializes |
| Ready for requests | 30-60 seconds total | `/api/images/saved` works |

## Success Indicators

✅ Init container completes successfully
✅ Main API container starts
✅ Pod shows "Running" status
✅ Frontend can fetch saved images without 500 error

## Questions?

See detailed documentation:
- `KUBERNETES_MIGRATIONS_GUIDE.md` - Full guide with examples
- `MIGRATION_FIX_SUMMARY.md` - Overview of changes
- Program.cs - See migration-only implementation

