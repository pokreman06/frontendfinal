# Production Deployment Guide

## Prerequisites

1. Kubernetes cluster with nginx ingress controller
2. Docker Hub account (or other container registry)
3. Domain names configured (api.nagent.duckdns.org, client.nagent.duckdns.org)
4. Keycloak instance for authentication

## Secrets Setup

Before deploying, create the Kubernetes secrets with your actual values:

```bash
kubectl create namespace nate-agent

kubectl create secret generic nate-agent-secrets \
  --namespace=nate-agent \
  --from-literal=DATABASE_URL='Host=postgres.nate-agent.svc.cluster.local;Port=5432;Database=mydb;Username=myuser;Password=YOUR_PASSWORD' \
  --from-literal=GOOGLE_API='YOUR_GOOGLE_API_KEY' \
  --from-literal=CUSTOM_SEARCH_ENGINE='YOUR_CUSTOM_SEARCH_ENGINE_ID' \
  --from-literal=PIXABAY_API_KEY='YOUR_PIXABAY_API_KEY' \
  --from-literal=KEYCLOAK_AUTHORITY='https://auth-dev.snowse.io/realms/DevRealm' \
  --from-literal=KEYCLOAK_AUDIENCE='nagent-api' \
  --from-literal=FACEBOOK_PAGE_ID='YOUR_FACEBOOK_PAGE_ID' \
  --from-literal=FACEBOOK_PAGE_ACCESS_TOKEN='YOUR_FACEBOOK_PAGE_ACCESS_TOKEN' \
  --from-literal=MCP_SERVICE_URL='http://mcp-service.nate-agent.svc.cluster.local:8000'
```

## Build and Push Docker Images

### 1. Build and push API image
```bash
docker build -t nhowell02/agentserver:latest -f Dockerfile .
docker push nhowell02/agentserver:latest
```

### 2. Build and push Client image
```bash
cd AgentFront/Agent.Api
docker build -t nhowell02/agentclient:latest \
  --build-arg VITE_API_URL="api.nagent.duckdns.org" \
  --build-arg VITE_OIDC_AUTHORITY="https://auth-dev.snowse.io/realms/DevRealm" \
  --build-arg VITE_OIDC_CLIENT_ID="nagent" \
  --build-arg VITE_OIDC_REDIRECT_URI="https://client.nagent.duckdns.org/" \
  --build-arg VITE_OIDC_POST_LOGOUT_REDIRECT_URI="https://client.nagent.duckdns.org/" \
  --build-arg VITE_OIDC_RESPONSE_TYPE="code" \
  --build-arg VITE_OIDC_SCOPE="openid profile email" \
  --build-arg VITE_OIDC_AUDIENCE="nagent-api" \
  .
docker push nhowell02/agentclient:latest
cd ../..
```

### 3. Build and push MCP service image
```bash
cd Agent.mcp
docker build -t nhowell02/agentmcp:latest .
docker push nhowell02/agentmcp:latest
cd ..
```

## Deploy to Kubernetes

### 1. Apply all manifests
```bash
# Set TAG environment variable for image versions
export TAG=latest

# Apply database resources
kubectl apply -f Kubernetes/sql-config.yaml
kubectl apply -f Kubernetes/sql-pvc.yaml
kubectl apply -f Kubernetes/sql-dep.yaml
kubectl apply -f Kubernetes/sql-ser.yaml

# Apply secret (or create it manually as shown above)
# envsubst < Kubernetes/secret.yaml | kubectl apply -f -

# Apply MCP service
envsubst < Kubernetes/mcp-dep.yaml | kubectl apply -f -
kubectl apply -f Kubernetes/mcp-ser.yaml

# Apply API
envsubst < Kubernetes/api-dep.yaml | kubectl apply -f -
kubectl apply -f Kubernetes/api-ser.yaml
kubectl apply -f Kubernetes/api-ingress.yaml

# Apply Client
envsubst < Kubernetes/client-dep.yaml | kubectl apply -f -
kubectl apply -f Kubernetes/client-ser.yaml
kubectl apply -f Kubernetes/client-ingress.yaml
```

### 2. Verify deployment
```bash
kubectl get pods -n nate-agent
kubectl get services -n nate-agent
kubectl get ingress -n nate-agent
```

### 3. Check logs if needed
```bash
kubectl logs -n nate-agent -l app=api-deployment
kubectl logs -n nate-agent -l app=mcp-deployment
kubectl logs -n nate-agent -l app=client-deployment
```

## Important Production Changes Needed

### 1. Re-enable Authorization
In the following files, uncomment the `[Authorize]` attributes:
- `AgentApi/Controllers/ImagesController.cs`
- `AgentApi/Controllers/QueryThemesController.cs`

Search for "TODO: Re-enable [Authorize] for production deployment" and uncomment the line below.

### 2. Configure Keycloak Client
Ensure your Keycloak realm has a client configured with:
- Client ID: `nagent`
- Valid Redirect URIs: `https://client.nagent.duckdns.org/*`
- Audience: `nagent-api`

### 3. Environment Variables
Ensure all environment variables in the secret are properly set for production.

## Updating Deployments

When updating code:

1. Build and push new images with a version tag:
```bash
docker build -t nhowell02/agentserver:v1.0.1 .
docker push nhowell02/agentserver:v1.0.1
export TAG=v1.0.1
envsubst < Kubernetes/api-dep.yaml | kubectl apply -f -
```

2. Or use rolling update:
```bash
kubectl set image deployment/api-deployment api-deployment=nhowell02/agentserver:v1.0.1 -n nate-agent
```

## Monitoring

Check the health of services:
```bash
# API health
curl https://api.nagent.duckdns.org/

# MCP health
kubectl port-forward -n nate-agent svc/mcp-service 8000:8000
curl http://localhost:8000/health
```

## Troubleshooting

### Pods not starting
```bash
kubectl describe pod <pod-name> -n nate-agent
```

### Database connection issues
Verify the DATABASE_URL secret is correct and the postgres service is running:
```bash
kubectl get svc postgres -n nate-agent
```

### MCP service not accessible from API
Check that the MCP_SERVICE_URL environment variable is correctly set to:
`http://mcp-service.nate-agent.svc.cluster.local:8000`
