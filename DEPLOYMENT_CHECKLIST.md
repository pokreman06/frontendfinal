# Pre-Deployment Checklist

## ✅ Code Changes Complete

- [x] Program.cs updated with `--migrate-only` flag support
- [x] Conditional service registration (skip when migrating)
- [x] Proper exit handling (exit 1 on failure, return on success)
- [x] Kubernetes/api-dep.yaml updated with init container
- [x] Kubernetes/migrations-job.yaml created for manual runs
- [x] All environment variables properly configured

## ✅ Testing Checklist

### Local Testing (Docker Compose)
- [ ] `docker compose down -v` (clean state)
- [ ] `docker compose up --build` (rebuild with migrations)
- [ ] Check logs for "Migrations applied successfully"
- [ ] Test: `curl http://localhost:8000/api/images/saved`
- [ ] Open http://localhost:5173 in browser
- [ ] Navigate to Images/Saved Images page
- [ ] Verify no "relation saved_images does not exist" error

### Pre-Kubernetes Testing
- [ ] Docker image builds successfully: `docker build -t nhowell02/agentserver:latest .`
- [ ] Image runs locally: `docker run -it nhowell02/agentserver:latest dotnet AgentApi.dll --migrate-only`
- [ ] Image pushes successfully: `docker push nhowell02/agentserver:latest`

## ✅ Kubernetes Deployment Checklist

### Before Deployment
- [ ] Kubernetes cluster is accessible: `kubectl cluster-info`
- [ ] `nate-agent` namespace exists: `kubectl get namespace nate-agent`
- [ ] `nate-agent-secrets` secret exists: `kubectl get secrets -n nate-agent`
- [ ] PostgreSQL pod is running: `kubectl get pods -n nate-agent | grep postgres`
- [ ] Database is healthy: `kubectl logs -n nate-agent deployment/postgres | tail -20`

### Deployment
- [ ] Image pushed to registry
- [ ] `TAG` environment variable set (or manually update api-dep.yaml)
- [ ] Deploy: `kubectl apply -f Kubernetes/api-dep.yaml`

### Post-Deployment Verification
- [ ] Pod created: `kubectl get pods -n nate-agent | grep api-deployment`
- [ ] Init container running: `kubectl describe pod -n nate-agent <pod-name> | grep -A 20 "Init Containers"`
- [ ] Init container logs show success:
  ```powershell
  kubectl logs -n nate-agent deployment/api-deployment -c migrations
  # Should show "Migrations applied successfully"
  ```
- [ ] Main container started: `kubectl get pods -n nate-agent -o wide | grep api-deployment`
- [ ] API ready: `kubectl logs -n nate-agent deployment/api-deployment -c api-deployment | tail -20`

### Functionality Testing
- [ ] Endpoint accessible: `curl https://api.nagent.duckdns.org/api/images/saved`
- [ ] No 500 errors
- [ ] Frontend loads without console errors
- [ ] Images page shows saved images (or empty if none exist)
- [ ] Can save a new image
- [ ] Can delete an image
- [ ] Can view image preferences

## ⚠️ Potential Issues & Solutions

### Issue: Pod stuck in "Init:0/1"
```powershell
kubectl describe pod -n nate-agent <pod-name>
kubectl logs -n nate-agent <pod-name> -c migrations --tail=50
```
**Likely cause**: Database not accessible
**Solution**: Check postgres pod, verify DATABASE_URL secret

### Issue: Init container says "Migrations applied" but tables still missing
```powershell
# Check if app is actually running the migration logic
kubectl logs -n nate-agent <pod-name> -c migrations
# Should see database connection log
```
**Solution**: Verify migration files are in the Docker image

### Issue: "relation saved_images does not exist" still appearing
```powershell
# This means migrations didn't run
# Option 1: Restart pod
kubectl delete pod -n nate-agent -l app=api-deployment

# Option 2: Run migration job manually
kubectl apply -f Kubernetes/migrations-job.yaml
kubectl logs -n nate-agent -l job-name=db-migrations
```

### Issue: "InvalidOperationException: No active transaction"
**Cause**: Database not ready yet
**Solution**: Built-in retry logic handles this (10 retries, 2-second intervals)

## 📋 Rollback Plan

If the init container approach causes issues:

```powershell
# Step 1: Remove init container from deployment
# Edit Kubernetes/api-dep.yaml and remove the initContainers section

# Step 2: Redeploy without migrations
kubectl apply -f Kubernetes/api-dep.yaml

# Step 3: Option A - Run migrations manually using job
kubectl apply -f Kubernetes/migrations-job.yaml
kubectl wait --for=condition=complete job/db-migrations -n nate-agent --timeout=300s

# OR Option B - Run migrations directly on database
# (Requires direct database access)
```

## 📊 Deployment Timeline

| Phase | Time | Description |
|-------|------|-------------|
| Pre-deployment | - | Code review, local testing |
| Deploy | 1 min | `kubectl apply` command |
| Init container | 30-60 sec | Migrations apply |
| API startup | 10-20 sec | Application initializes |
| Ready | 2-3 min total | System ready for requests |

## 📞 Support Info

### Logs to Check
1. Init container: `kubectl logs -n nate-agent deployment/api-deployment -c migrations`
2. Main container: `kubectl logs -n nate-agent deployment/api-deployment -c api-deployment`
3. Database: `kubectl logs -n nate-agent deployment/postgres`

### Debugging Commands
```powershell
# Full pod description
kubectl describe pod -n nate-agent <pod-name>

# All pod events
kubectl get events -n nate-agent --sort-by='.lastTimestamp'

# Database connectivity test
kubectl exec -it -n nate-agent <postgres-pod> -- psql -U myuser -d mydb -c "\dt"

# Check migrations table in database
kubectl exec -it -n nate-agent <postgres-pod> -- psql -U myuser -d mydb -c "SELECT * FROM __EFMigrationsHistory;"
```

### Key Contacts
- Frontend Issues: Check browser console
- API Issues: Check `kubectl logs` for api-deployment
- Database Issues: Check postgres pod and connection string
- Kubernetes Issues: Check `kubectl describe pod`

## ✅ Final Checklist

- [ ] All code changes reviewed
- [ ] Local testing passed
- [ ] Docker image builds successfully
- [ ] Image pushed to registry
- [ ] Kubernetes secrets verified
- [ ] Database running and accessible
- [ ] Deployment applied
- [ ] Migration logs show success
- [ ] API container started
- [ ] Endpoint tested and working
- [ ] Frontend shows no errors
- [ ] Feature testing (save/delete images) passed
- [ ] Documented in KUBERNETES_MIGRATIONS_GUIDE.md

---

**Ready to Deploy**: Yes ✅  
**Risk Assessment**: Low - backward compatible, non-breaking changes  
**Estimated Deployment Time**: 5-10 minutes  
**Rollback Complexity**: Medium - can revert api-dep.yaml or use migrations job  

