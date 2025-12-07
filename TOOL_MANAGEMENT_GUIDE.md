# Tool Management Feature Guide

## Overview

The Tool Settings feature allows you to enable or disable specific agentic tools that the AI agent can use. This gives you fine-grained control over which capabilities are available during agent execution.

## Features

### 1. Tool Settings Management Page (`/tool-settings`)

A dedicated page where you can:
- **View all available tools** with descriptions
- **Enable/disable tools** individually with checkboxes
- **Bulk operations** - Enable All / Disable All buttons
- **Real-time feedback** - See count of enabled vs total tools
- **Persistent storage** - Changes are saved to the database

### 2. Automatic Tool Filtering

When the AI agent runs:
- If you've specified `AllowedTools` in the API request, those tools are used (backwards compatible)
- Otherwise, the agent automatically uses only **enabled tools** from the tool settings database
- If no tools are configured in the database, all available tools are used by default (fallback)

### 3. Available Tools

The system manages these tools:

| Tool Name | Description |
|-----------|-------------|
| `web_search` | Search the web using Google Custom Search API |
| `fetch_page` | Fetch and parse text content from a webpage |
| `post_to_facebook` | Post content to Facebook |
| `post_image_to_facebook` | Post images to Facebook |

Additional tools from the Facebook MCP service are also managed.

## How to Use

### Via User Interface

1. Navigate to **Tool Settings** from the main navigation menu
2. Each tool appears as a card with:
   - Tool name
   - Current status (Enabled/Disabled)
   - Description
   - Checkbox for toggling

3. Click on any card or its checkbox to toggle the tool
4. Use **Enable All** or **Disable All** for bulk operations
5. Click **Save Changes** to persist your selections

### Via API

#### Get All Tool Settings
```
GET /api/tool-settings
```

Response:
```json
[
  {
    "id": 1,
    "toolName": "web_search",
    "isEnabled": true,
    "description": "Search the web using Google Custom Search API"
  },
  ...
]
```

#### Update a Tool Setting
```
PUT /api/tool-settings/{id}
Content-Type: application/json

{
  "isEnabled": false,
  "description": "Optional updated description"
}
```

#### Bulk Update All Tools
```
PUT /api/tool-settings/bulk
Content-Type: application/json

{
  "tools": [
    { "toolName": "web_search", "isEnabled": true },
    { "toolName": "fetch_page", "isEnabled": false },
    { "toolName": "post_to_facebook", "isEnabled": true },
    { "toolName": "post_image_to_facebook", "isEnabled": false }
  ]
}
```

#### Get Only Enabled Tools
```
GET /api/tool-settings/enabled
```

Response:
```json
[
  "web_search",
  "post_to_facebook"
]
```

## Architecture

### Backend (ASP.NET Core)

**Database Schema:**
```sql
CREATE TABLE tool_settings (
  id SERIAL PRIMARY KEY,
  tool_name TEXT UNIQUE NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  description TEXT DEFAULT ''
);
```

**Controller:** `ToolSettingsController.cs`
- Endpoints for CRUD operations
- Bulk update support
- Query for enabled tools

**Entity:** `ToolSettings` in `DbContext.cs`

**Integration Point:** `AgentController.Chat()` method
```csharp
// Falls back to database settings if AllowedTools not specified
var enabledToolNames = await _context.ToolSettings
    .Where(t => t.IsEnabled)
    .Select(t => t.ToolName)
    .ToListAsync();

allTools = allTools.Where(t => enabledToolNames.Contains(t.Function.Name)).ToList();
```

### Frontend (React/TypeScript)

**Component:** `ToolSettingsPage.tsx`
- Displays tool list with toggle UI
- Handles bulk operations
- Submits updates via API
- Environment-aware API URL resolution

**Navigation:** Added to Layout and App router
- Route: `/tool-settings`
- Link in main navigation menu

## Use Cases

### Example 1: Restrict to Search Only
You want the agent to only search the web, not post to Facebook:
1. Go to Tool Settings
2. Enable: `web_search`, `fetch_page`
3. Disable: `post_to_facebook`, `post_image_to_facebook`
4. Click Save Changes

Result: Agent can only search and fetch pages, cannot post to Facebook

### Example 2: Disable Web Search
You want to prevent the agent from making internet searches:
1. Go to Tool Settings
2. Disable: `web_search`
3. Keep others enabled
4. Click Save Changes

Result: Agent can post to Facebook and fetch specific pages, but cannot perform web searches

### Example 3: Full Access (Default)
Enable all tools for maximum agent capabilities:
1. Go to Tool Settings
2. Click "Enable All"
3. Click Save Changes

## Notes

- **Default Behavior:** All tools start enabled (is_enabled = true)
- **Backward Compatibility:** The API request's `AllowedTools` parameter takes precedence over database settings
- **Performance:** Tool settings are queried once per agent request
- **Logging:** Agent logs which tools are available and which filtering method was used

## Troubleshooting

**No tools showing in the list?**
- Tool settings may need to be initialized
- Check if the `tool_settings` table exists in PostgreSQL
- Tools will auto-initialize when the agent first runs

**Changes not taking effect?**
- Ensure you clicked "Save Changes"
- Check browser console for any API errors
- Verify the API call succeeded (should see success message)

**Agent still using disabled tools?**
- If using `AllowedTools` in API request, that takes precedence
- Check if agent has pending requests from before the change
- Verify the tool name matches exactly (case-sensitive)
