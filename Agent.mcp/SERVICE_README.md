# Facebook MCP Service

A FastAPI-based HTTP service for managing Facebook Page posts, comments, and analytics through Docker.

## Features

- **Post Management**: Create, update, delete, and schedule posts
- **Comment Management**: Reply, hide, delete comments; filter negative comments
- **Analytics**: Get post insights, impressions, reactions, engagement metrics
- **Direct Messaging**: Send DMs to users
- **Bulk Operations**: Delete or hide multiple comments at once
- **Health Checks**: Built-in health check endpoint
- **MCP Protocol**: Tools available via Model Context Protocol

## Prerequisites

- Docker and Docker Compose installed
- Facebook Page Access Token (in `.env` file)
- Python 3.12+ (if running locally without Docker)

## Quick Start with Docker

### 1. Build and Run

```bash
docker-compose up -d
```

This will:
- Build the Docker image
- Start the service on port 8000
- Set up health checks
- Create an isolated network

### 2. Verify Service is Running

```bash
curl http://localhost:8000/health
```

Expected response:
```json
{"status": "healthy", "service": "FacebookMCP"}
```

### 3. View Logs

```bash
docker-compose logs -f facebook-mcp-service
```

## API Endpoints

### Health Check
- **GET** `/health` - Service health status

### Posts
- **POST** `/api/post?message=<text>` - Create a post
- **GET** `/api/posts` - Get all page posts
- **GET** `/api/posts/{post_id}` - Get post details
- **DELETE** `/api/posts/{post_id}` - Delete a post
- **GET** `/api/posts/{post_id}/insights` - Get post insights
- **GET** `/api/posts/{post_id}/reactions` - Get reaction breakdown
- **GET** `/api/posts/{post_id}/comments` - Get post comments

### Comments
- **POST** `/api/reply?post_id=<id>&comment_id=<id>&message=<text>` - Reply to comment
- **DELETE** `/api/comments/{comment_id}` - Delete comment
- **POST** `/api/comments/{comment_id}/hide` - Hide comment

### Messaging
- **POST** `/api/messages?user_id=<id>&message=<text>` - Send DM

### Analytics
- **GET** `/api/stats` - Get page fan count

## Environment Setup

Create a `.env` file in the `Agent.mcp` directory:

```env
FACEBOOK_ACCESS_TOKEN=<your_access_token>
FACEBOOK_PAGE_ID=<your_page_id>
```

## Local Development (without Docker)

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python server.py
```

The service will start on `http://localhost:8000`

## Docker Commands

### Stop the service
```bash
docker-compose down
```

### Rebuild the image
```bash
docker-compose up -d --build
```

### Check service status
```bash
docker-compose ps
```

### Access logs
```bash
docker-compose logs facebook-mcp-service
```

## API Examples

### Create a post
```bash
curl -X POST "http://localhost:8000/api/post?message=Hello%20World"
```

### Get posts
```bash
curl http://localhost:8000/api/posts
```

### Get post insights
```bash
curl http://localhost:8000/api/posts/{post_id}/insights
```

### Send a DM
```bash
curl -X POST "http://localhost:8000/api/messages?user_id=USER_ID&message=Hello"
```

## Troubleshooting

### Container won't start
```bash
docker-compose logs facebook-mcp-service
```

### Permission denied errors
Ensure Docker daemon is running and you have proper permissions.

### Health check failing
Wait a few seconds for the service to fully initialize, then check the logs.

### API returning errors
Verify your Facebook credentials are correct in the `.env` file.

## Architecture

```
Client/Agent
    ↓
FastAPI (HTTP Layer)
    ↓
Manager (Business Logic)
    ↓
FacebookAPI (API Wrapper)
    ↓
Facebook Graph API
```

## Performance Notes

- The service uses uvicorn with async/await for high concurrency
- Health checks run every 30 seconds with a 10-second timeout
- Request logs are printed to stdout
- All requests return JSON responses

## Security Considerations

- Keep your `.env` file with credentials private
- Use `.gitignore` to exclude `.env` from version control
- Consider using Docker secrets in production
- Restrict network access to the service if possible

## Support

For issues with the Facebook API, refer to:
https://developers.facebook.com/docs/
