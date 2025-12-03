# Testing Guide for Facebook MCP Service & Agent API

## Prerequisites
1. Docker and Docker Compose installed
2. Facebook API credentials (access token, page ID) in `.env` file
3. AI service running at `http://ai-snow.reindeer-pinecone.ts.net:9292`

## Setup

### 1. Create `.env` file in Agent.mcp directory
```bash
# Agent.mcp/.env
FACEBOOK_ACCESS_TOKEN=your_facebook_access_token
FACEBOOK_PAGE_ID=your_facebook_page_id
```

### 2. Start all services
```bash
cd c:\Users\pokre\frontendfinal
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

Expected output:
- `web` (AgentApi) on port 8000
- `client` (Frontend) on port 5173
- `facebook-mcp-service` on port 8001
- `postgres` on port 5432

## Testing Approaches

### Option 1: Test MCP Service Directly (Fastest)

#### 1a. Health Check
```bash
curl http://localhost:8001/health
```

Expected response:
```json
{"status": "healthy", "service": "FacebookMCP"}
```

#### 1b. Test Individual Facebook Endpoints

**Get Page Posts:**
```bash
curl http://localhost:8001/api/posts
```

**Create a Post:**
```bash
curl -X POST "http://localhost:8001/api/post?message=Hello%20World"
```

**Get Post Insights:**
```bash
curl http://localhost:8001/api/posts/{post_id}/insights
```

**Get Page Stats:**
```bash
curl http://localhost:8001/api/stats
```

See `Agent.mcp/SERVICE_README.md` for all available endpoints.

---

### Option 2: Test Agent API Endpoints

#### 2a. Health Check
```bash
curl http://localhost:8000/health
```

#### 2b. Get Available MCP Tools
```bash
curl http://localhost:8000/api/agent/tools
```

Expected response: List of Facebook tools the agent can use.

#### 2c. Chat with Agent (Agentic Loop)
```bash
curl -X POST http://localhost:8000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Post a message saying Hello World to our Facebook page",
    "model": "default",
    "conversationHistory": []
  }'
```

This will:
1. Send request to AI at `http://ai-snow.reindeer-pinecone.ts.net:9292/v1/chat/completions`
2. AI decides to use Facebook MCP tool
3. Agent executes the tool via `http://facebook-mcp-service:8000`
4. Returns result with conversation history

---

### Option 3: Using PowerShell Scripts

Create `test-mcp.ps1`:
```powershell
# Test MCP Service Health
Write-Host "Testing MCP Service Health..."
$health = Invoke-RestMethod -Uri "http://localhost:8001/health" -Method Get
$health | ConvertTo-Json

# Test available tools
Write-Host "Testing Agent Tools..."
$tools = Invoke-RestMethod -Uri "http://localhost:8000/api/agent/tools" -Method Get
$tools | ConvertTo-Json | Write-Host

# Test chat endpoint
Write-Host "Testing Chat Endpoint..."
$chatRequest = @{
    userMessage = "What are the recent posts on our Facebook page?"
    model = "default"
    conversationHistory = @()
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:8000/api/agent/chat" `
    -Method Post `
    -Body $chatRequest `
    -ContentType "application/json"

$response | ConvertTo-Json | Write-Host
```

Run it:
```powershell
.\test-mcp.ps1
```

---

### Option 4: Using Postman

1. Open Postman
2. Create new collection "Facebook MCP Testing"
3. Add requests:

**Request 1: MCP Health**
- Method: GET
- URL: `http://localhost:8001/health`

**Request 2: Get Tools**
- Method: GET
- URL: `http://localhost:8000/api/agent/tools`

**Request 3: Chat with Agent**
- Method: POST
- URL: `http://localhost:8000/api/agent/chat`
- Headers: `Content-Type: application/json`
- Body:
```json
{
  "userMessage": "Post 'Hello from API' to our Facebook page",
  "model": "default",
  "conversationHistory": []
}
```

---

### Option 5: View Logs

```bash
# MCP Service logs
docker-compose logs -f facebook-mcp-service

# Agent API logs
docker-compose logs -f web

# All logs
docker-compose logs -f
```

---

## Testing Scenarios

### Scenario 1: Simple Post Creation
```bash
curl -X POST "http://localhost:8001/api/post?message=Test%20Post%20from%20API"
```

### Scenario 2: Get and Analyze Posts
```bash
# Get all posts
curl http://localhost:8001/api/posts

# Get specific post insights (use post_id from previous response)
curl http://localhost:8001/api/posts/{post_id}/insights

# Get reaction breakdown
curl http://localhost:8001/api/posts/{post_id}/reactions
```

### Scenario 3: Comment Management
```bash
# Get comments on a post
curl http://localhost:8001/api/posts/{post_id}/comments

# Reply to a comment
curl -X POST "http://localhost:8001/api/reply?post_id=POST_ID&comment_id=COMMENT_ID&message=Thanks!"

# Hide a comment
curl -X POST "http://localhost:8001/api/comments/{comment_id}/hide"

# Delete a comment
curl -X DELETE "http://localhost:8001/api/comments/{comment_id}"
```

### Scenario 4: Full Agent Conversation
```bash
curl -X POST http://localhost:8000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "userMessage": "Get the number of comments on our most recent post and if there are any, reply to the first one with a thank you message",
    "model": "default",
    "conversationHistory": []
  }'
```

---

## Troubleshooting

### MCP Service Not Responding
```bash
docker-compose logs facebook-mcp-service
docker-compose restart facebook-mcp-service
```

### Agent API Can't Reach MCP Service
- Check if services are on same network: `docker network ls`
- Verify service names in docker-compose: `docker-compose ps`
- Use service name `facebook-mcp-service:8000` for internal Docker calls

### AI Service Connection Issues
- Verify AI service is running: `curl http://ai-snow.reindeer-pinecone.ts.net:9292/health`
- Check firewall/network access
- Verify endpoint URL in `Program.cs`

### Facebook API Errors
- Verify access token in `.env` file
- Check token permissions and expiration
- Ensure page ID matches your Facebook page
- Check Facebook Graph API docs for rate limits

### Container Won't Start
```bash
docker-compose logs facebook-mcp-service
docker-compose down
docker-compose up -d --build
```

---

## Success Criteria

✅ MCP Service health check returns 200
✅ Agent can retrieve list of tools
✅ Chat endpoint responds without errors
✅ Logs show tool execution calls
✅ Facebook API returns results (not auth errors)

---

## Next Steps

If everything works:
1. Integrate with frontend (AgentFront)
2. Set up persistent conversation storage
3. Add more Facebook tools as needed
4. Implement rate limiting and caching
