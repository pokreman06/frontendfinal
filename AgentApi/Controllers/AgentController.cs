using AgentApi.Models;
using AgentApi.Services;
using AgentApi.Services.SearchValidation;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace AgentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AgentController : ControllerBase
    {
        private readonly ILocalAIService _aiService;
        private readonly IMcpClient _mcpClient;
        private readonly ILogger<AgentController> _logger;
        private readonly PromptSearcher _searcher;
        private readonly WebPageFetcher _pageFetcher;

        public AgentController(
            ILocalAIService aiService, 
            IMcpClient mcpClient,
            ILogger<AgentController> logger,
            PromptSearcher searcher,
            WebPageFetcher pageFetcher)
        {
            _aiService = aiService;
            _mcpClient = mcpClient;
            _logger = logger;
            _searcher = searcher;
            _pageFetcher = pageFetcher;
        }

        [HttpPost("chat")]
        public async Task<ActionResult<AgentResponse>> Chat([FromBody] AgentRequest request)
        {
            try
            {
                // Get available MCP tools
                var mcpTools = await _mcpClient.GetAvailableToolsAsync();
                
                // Add local tools (web_search and fetch_page)
                var localTools = new List<FunctionTool>
                {
                    CreateLocalTool("web_search", "Search the web using Google Custom Search API. Can filter by file type (pdf, doc, ppt, xls, etc).",
                        new[] { 
                            ("query", "string", "The search query to execute", true),
                            ("file_type", "string", "Optional file type filter (e.g., pdf, doc, ppt, xls)", false)
                        }),
                    CreateLocalTool("fetch_page", "Fetch and parse the text content from a webpage URL",
                        new[] { 
                            ("url", "string", "The URL of the webpage to fetch and parse", true)
                        })
                };
                
                var allTools = new List<FunctionTool>();
                allTools.AddRange(localTools);
                allTools.AddRange(mcpTools);
                
                _logger.LogInformation("Available tools: {LocalCount} local + {McpCount} MCP = {Total} total", 
                    localTools.Count, mcpTools.Count, allTools.Count);

                // Build conversation history with system message
                var messages = request.ConversationHistory ?? new List<Message>();
                
                // Add system message at the beginning if not already present
                if (messages.Count == 0 || messages[0].Role != "system")
                {
                    var systemMessage = new Message
                    {
                        Role = "system",
                        Content = @"You are a helpful AI assistant. When you need to perform actions, respond with this format:

ACTION: [function_name]
PARAMETERS:
[parameter]=[value]
EXPLANATION: [what you're doing]

Available functions:
- web_search: Search the web. Parameters: query (required), file_type (optional: pdf, doc, ppt, xls)
- fetch_page: Read webpage content. Parameters: url (required)
- post_to_facebook: Post to Facebook. Parameters: message (required)
- post_image_to_facebook: Post image to Facebook. Parameters: image_url, caption
- get_page_posts: Get Facebook posts. No parameters needed.

Always use this exact format when you need to perform an action."
                    };
                    messages.Insert(0, systemMessage);
                }
                
                if (string.IsNullOrEmpty(request.UserMessage))
                {
                    return BadRequest("User message cannot be empty");
                }
                
                // Check if user message already contains ACTION format - execute directly
                if (request.UserMessage.Contains("ACTION:") && request.UserMessage.Contains("PARAMETERS:"))
                {
                    _logger.LogInformation("Direct ACTION command detected in user message");
                    var toolCalls = ExtractToolCallsFromText(request.UserMessage, mcpTools);
                    
                    if (toolCalls.Count > 0)
                    {
                        var toolResults = new List<string>();
                        foreach (var (toolName, args) in toolCalls)
                        {
                            try
                            {
                                string result;
                                
                                // Handle web_search locally
                                if (toolName == "web_search")
                                {
                                    if (args.TryGetValue("query", out var queryObj) && queryObj is string query)
                                    {
                                        string? fileType = null;
                                        if (args.TryGetValue("file_type", out var fileTypeObj) && fileTypeObj is string ft)
                                        {
                                            fileType = ft;
                                        }
                                        var searchResults = await _searcher.GetQuery(query, fileType);
                                        result = JsonSerializer.Serialize(new { results = searchResults });
                                        _logger.LogInformation("Web search executed for query: {Query}, file_type: {FileType}, found {Count} results", query, fileType ?? "none", searchResults.Count);
                                    }
                                    else
                                    {
                                        result = "{\"error\": \"Missing query parameter\"}";
                                    }
                                }
                                // Handle fetch_page locally
                                else if (toolName == "fetch_page")
                                {
                                    if (args.TryGetValue("url", out var urlObj) && urlObj is string url)
                                    {
                                        var pageContent = await _pageFetcher.FetchPageContent(url);
                                        result = JsonSerializer.Serialize(new { url = url, content = pageContent });
                                        _logger.LogInformation("Page fetched from URL: {Url}", url);
                                    }
                                    else
                                    {
                                        result = "{\"error\": \"Missing url parameter\"}";
                                    }
                                }
                                else
                                {
                                    // Execute MCP tool
                                    result = await _mcpClient.ExecuteToolAsync(toolName, args);
                                }
                                
                                toolResults.Add($"Successfully executed {toolName}: {result}");
                                _logger.LogInformation("Direct tool {Tool} executed successfully", toolName);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Error executing direct tool {Tool}", toolName);
                                toolResults.Add($"Error executing {toolName}: {ex.Message}");
                            }
                        }
                        
                        return Ok(new AgentResponse
                        {
                            Response = string.Join("\n", toolResults),
                            ConversationHistory = messages,
                            UsedMcp = true,
                            ToolsUsed = toolCalls.Select(t => t.toolName).ToList()
                        });
                    }
                }
                
                messages.Add(new Message
                {
                    Role = "user",
                    Content = request.UserMessage
                });

                var usedMcp = false;
                var toolsUsed = new List<string>();
                var maxIterations = 10; // Prevent infinite loops
                var iteration = 0;

                while (iteration < maxIterations)
                {
                    iteration++;

                    // Validate all messages have content
                    foreach (var msg in messages)
                    {
                        if (msg.Role != "tool" && string.IsNullOrEmpty(msg.Content))
                        {
                            _logger.LogWarning("Message with role '{Role}' has empty content", msg.Role);
                            msg.Content = msg.Content ?? "";
                        }
                    }

                    // Create AI request without tools (model doesn't support function calling properly)
                    // Instead, rely on ACTION format parsing from content
                    var aiRequest = new LocalAIRequest
                    {
                        Model = request.Model ?? "default",
                        Messages = messages,
                        Tools = null, // Don't send tools to this model - use ACTION format instead
                        MaxTokens = 2048
                    };

                    // Send to local AI
                    var aiResponse = await _aiService.SendMessageAsync(aiRequest);

                    if (aiResponse.Choices == null || aiResponse.Choices.Count == 0)
                    {
                        return BadRequest("AI returned no choices");
                    }

                    var choice = aiResponse.Choices[0];
                    var assistantMessage = choice.Message;
                    
                    // Clean up response content if it contains internal reasoning tokens
                    if (!string.IsNullOrEmpty(assistantMessage.Content))
                    {
                        // Remove special tokens like <|channel|>, <|message|>, <|end|>, etc.
                        var cleanedContent = System.Text.RegularExpressions.Regex.Replace(
                            assistantMessage.Content, 
                            @"<\|[^|]+\|>", 
                            "");
                        
                        // If the content looks like it's trying to call a function but in text form
                        if (cleanedContent.Contains("functions.web_search") || cleanedContent.Contains("functions.fetch_page"))
                        {
                            _logger.LogWarning("AI returned function call in text format instead of tool_calls. Raw content: {Content}", 
                                assistantMessage.Content.Substring(0, Math.Min(200, assistantMessage.Content.Length)));
                            
                            // Try to extract function call from malformed response
                            assistantMessage.Content = "I apologize, but I encountered an issue processing your request. Let me try a different approach - could you rephrase your question?";
                        }
                        else
                        {
                            assistantMessage.Content = cleanedContent.Trim();
                        }
                    }

                    // Add assistant message to history
                    messages.Add(assistantMessage);

                    // Check if response contains ACTION format in content
                    var hasActionInContent = !string.IsNullOrEmpty(assistantMessage.Content) && 
                                            assistantMessage.Content.Contains("ACTION:") &&
                                            assistantMessage.Content.Contains("PARAMETERS:");
                    
                    // Handle ACTION format in content
                    if (hasActionInContent)
                    {
                        usedMcp = true;
                        _logger.LogInformation("AI returned ACTION format in content");
                        
                        var toolCalls = ExtractToolCallsFromText(assistantMessage.Content, allTools);
                        if (toolCalls.Count > 0)
                        {
                            foreach (var (toolName, args) in toolCalls)
                            {
                                toolsUsed.Add(toolName);
                                
                                try
                                {
                                    string result;
                                    
                                    // Handle web_search locally
                                    if (toolName == "web_search")
                                    {
                                        if (args.TryGetValue("query", out var queryObj) && queryObj is string query)
                                        {
                                            string? fileType = null;
                                            if (args.TryGetValue("file_type", out var fileTypeObj) && fileTypeObj is string ft)
                                            {
                                                fileType = ft;
                                            }
                                            var searchResults = await _searcher.GetQuery(query, fileType);
                                            result = JsonSerializer.Serialize(new { results = searchResults });
                                            _logger.LogInformation("Web search executed: {Query}, file_type: {FileType}, found {Count} results", 
                                                query, fileType ?? "none", searchResults.Count);
                                        }
                                        else
                                        {
                                            result = "{\"error\": \"Missing query parameter\"}";
                                        }
                                    }
                                    // Handle fetch_page locally
                                    else if (toolName == "fetch_page")
                                    {
                                        if (args.TryGetValue("url", out var urlObj) && urlObj is string url)
                                        {
                                            var pageContent = await _pageFetcher.FetchPageContent(url);
                                            result = JsonSerializer.Serialize(new { url = url, content = pageContent });
                                            _logger.LogInformation("Page fetched from: {Url}", url);
                                        }
                                        else
                                        {
                                            result = "{\"error\": \"Missing url parameter\"}";
                                        }
                                    }
                                    else
                                    {
                                        // Execute MCP tool
                                        result = await _mcpClient.ExecuteToolAsync(toolName, args);
                                    }
                                    
                                    // Replace the assistant message content with tool result
                                    assistantMessage.Content = $"Tool {toolName} executed. Result: {result}";
                                }
                                catch (Exception ex)
                                {
                                    _logger.LogError(ex, "Error executing tool {ToolName}", toolName);
                                    assistantMessage.Content = $"Error executing tool {toolName}: {ex.Message}";
                                }
                            }
                        }
                        
                        // Continue to next iteration to get AI's response about the tool results
                        continue;
                    }
                    
                    // Check if AI wants to use tools (proper OpenAI format)
                    if (choice.FinishReason == "tool_calls" && assistantMessage.ToolCalls != null)
                    {
                        usedMcp = true;
                        _logger.LogInformation("AI requested {Count} tool calls via tool_calls", 
                            assistantMessage.ToolCalls.Count);

                        // Execute each tool call
                        foreach (var toolCall in assistantMessage.ToolCalls)
                        {
                            var toolName = toolCall.Function.Name;
                            toolsUsed.Add(toolName);

                            try
                            {
                                // Parse arguments
                                var args = JsonSerializer.Deserialize<Dictionary<string, object>>(
                                    toolCall.Function.Arguments) ?? new Dictionary<string, object>();

                                string result;
                                
                                // Handle web_search locally
                                if (toolName == "web_search")
                                {
                                    if (args.TryGetValue("query", out var queryObj) && queryObj is JsonElement queryElement)
                                    {
                                        var query = queryElement.GetString() ?? "";
                                        string? fileType = null;
                                        if (args.TryGetValue("file_type", out var fileTypeObj) && fileTypeObj is JsonElement fileTypeElement)
                                        {
                                            fileType = fileTypeElement.GetString();
                                        }
                                        var searchResults = await _searcher.GetQuery(query, fileType);
                                        result = JsonSerializer.Serialize(new { results = searchResults });
                                    }
                                    else
                                    {
                                        result = "{\"error\": \"Missing query parameter\"}";
                                    }
                                }
                                // Handle fetch_page locally
                                else if (toolName == "fetch_page")
                                {
                                    if (args.TryGetValue("url", out var urlObj) && urlObj is JsonElement urlElement)
                                    {
                                        var url = urlElement.GetString() ?? "";
                                        var pageContent = await _pageFetcher.FetchPageContent(url);
                                        result = JsonSerializer.Serialize(new { url = url, content = pageContent });
                                    }
                                    else
                                    {
                                        result = "{\"error\": \"Missing url parameter\"}";
                                    }
                                }
                                else
                                {
                                    // Execute MCP tool
                                    result = await _mcpClient.ExecuteToolAsync(toolName, args);
                                }

                                // Add tool result to conversation
                                messages.Add(new Message
                                {
                                    Role = "tool",
                                    Content = result,
                                    ToolCallId = toolCall.Id,
                                    Name = toolName
                                });

                                _logger.LogInformation("Tool {Tool} executed successfully", toolName);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Error executing tool {Tool}", toolName);
                                
                                // Add error as tool result
                                messages.Add(new Message
                                {
                                    Role = "tool",
                                    Content = $"Error executing tool: {ex.Message}",
                                    ToolCallId = toolCall.Id,
                                    Name = toolName
                                });
                            }
                        }

                        // Continue conversation with tool results
                        continue;
                    }

                    // Check if AI's response contains tool call instructions (for models with custom formats)
                    if (!string.IsNullOrEmpty(assistantMessage.Content) && 
                        (assistantMessage.Content.Contains("post_to_facebook") || 
                        assistantMessage.Content.Contains("get_page_posts") ||
                        assistantMessage.Content.Contains("reply_to_comment") ||
                        assistantMessage.Content.Contains("delete_post") ||
                        assistantMessage.Content.Contains("delete_comment") ||
                        assistantMessage.Content.Contains("hide_comment") ||
                        assistantMessage.Content.Contains("get_post_insights") ||
                        assistantMessage.Content.Contains("post_image_to_facebook") ||
                        assistantMessage.Content.Contains("send_dm_to_user")))
                    {
                        usedMcp = true;
                        _logger.LogInformation("AI indicated tool usage in response content");

                        // Try to extract tool calls from the response
                        var toolCalls = ExtractToolCallsFromText(assistantMessage.Content, mcpTools);
                        
                        if (toolCalls.Count > 0)
                        {
                            var toolResults = new List<string>();
                            
                            foreach (var (toolName, args) in toolCalls)
                            {
                                toolsUsed.Add(toolName);

                                try
                                {
                                    // Execute MCP tool
                                    var result = await _mcpClient.ExecuteToolAsync(toolName, args);
                                    toolResults.Add($"Tool '{toolName}' result: {result}");

                                    _logger.LogInformation("Tool {Tool} executed successfully from text extraction", toolName);
                                }
                                catch (Exception ex)
                                {
                                    _logger.LogError(ex, "Error executing tool {Tool}", toolName);
                                    toolResults.Add($"Tool '{toolName}' error: {ex.Message}");
                                }
                            }

                            // Instead of continuing the loop with tool messages (which breaks the AI API),
                            // just return the result directly
                            var toolResultText = string.Join("\n", toolResults);
                            return Ok(new AgentResponse
                            {
                                Response = $"{assistantMessage.Content}\n\n{toolResultText}",
                                ConversationHistory = messages,
                                UsedMcp = usedMcp,
                                ToolsUsed = toolsUsed.Distinct().ToList()
                            });
                        }
                    }

                    // No more tool calls, we have final response
                    var finalResponse = assistantMessage.Content ?? "No response generated";

                    return Ok(new AgentResponse
                    {
                        Response = finalResponse,
                        ConversationHistory = messages,
                        UsedMcp = usedMcp,
                        ToolsUsed = toolsUsed.Distinct().ToList()
                    });
                }

                return BadRequest("Max iterations reached - possible infinite tool loop");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in chat endpoint");
                return StatusCode(500, $"Internal error: {ex.Message}");
            }
        }

        [HttpGet("tools")]
        public async Task<ActionResult<List<FunctionTool>>> GetAvailableTools()
        {
            try
            {
                var tools = await _mcpClient.GetAvailableToolsAsync();
                return Ok(tools);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting tools");
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpGet("health")]
        public IActionResult Health()
        {
            return Ok(new { status = "healthy", timestamp = DateTime.UtcNow });
        }

        private List<(string toolName, Dictionary<string, object> args)> ExtractToolCallsFromText(
            string content, List<FunctionTool> availableTools)
        {
            var toolCalls = new List<(string, Dictionary<string, object>)>();

            try
            {
                _logger.LogDebug("Extracting tool calls from content: {Content}", content);

                // First try the new plain text format
                var lines = content.Split(new[] { "\n", "\r\n" }, StringSplitOptions.None);
                string? currentAction = null;
                var currentParams = new Dictionary<string, object>();

                foreach (var line in lines)
                {
                    var trimmed = line.Trim();

                    if (trimmed.StartsWith("ACTION:"))
                    {
                        // Save previous action if any
                        if (!string.IsNullOrEmpty(currentAction) && 
                            (currentParams.Any() || IsParameterlessFunction(currentAction)))
                        {
                            toolCalls.Add((currentAction, currentParams));
                            _logger.LogInformation("Extracted action: {Action} with {ParamCount} parameters", 
                                currentAction, currentParams.Count);
                        }

                        currentAction = trimmed.Substring("ACTION:".Length).Trim();
                        currentParams = new Dictionary<string, object>();
                    }
                    else if (trimmed.StartsWith("PARAMETERS:"))
                    {
                        // Parameters section starts
                        continue;
                    }
                    else if (trimmed.StartsWith("EXPLANATION:"))
                    {
                        // End of parameters
                        if (!string.IsNullOrEmpty(currentAction) && 
                            (currentParams.Any() || IsParameterlessFunction(currentAction)))
                        {
                            toolCalls.Add((currentAction, currentParams));
                            _logger.LogInformation("Extracted action: {Action} with {ParamCount} parameters", 
                                currentAction, currentParams.Count);
                        }
                        currentAction = null;
                    }
                    else if (trimmed.Contains("=") && !string.IsNullOrEmpty(currentAction))
                    {
                        // Parse parameter line (format: key=value)
                        var parts = trimmed.Split(new[] { '=' }, 2);
                        if (parts.Length == 2)
                        {
                            var key = parts[0].Trim();
                            var value = parts[1].Trim();
                            currentParams[key] = value;
                        }
                    }
                }

                // Add last action if any
                if (!string.IsNullOrEmpty(currentAction) && 
                    (currentParams.Any() || IsParameterlessFunction(currentAction)))
                {
                    toolCalls.Add((currentAction, currentParams));
                    _logger.LogInformation("Extracted action: {Action} with {ParamCount} parameters", 
                        currentAction, currentParams.Count);
                }

                // Fallback: try JSON parsing if no actions found
                if (toolCalls.Count == 0)
                {
                    var jsonPattern = @"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}";
                    var matches = Regex.Matches(content, jsonPattern);

                    foreach (Match match in matches)
                    {
                        try
                        {
                            var jsonStr = match.Value;
                            using var doc = JsonDocument.Parse(jsonStr);
                            var root = doc.RootElement;

                            // Look for "function" and "parameters" fields
                            if (root.TryGetProperty("function", out var funcProp) && 
                                funcProp.ValueKind == JsonValueKind.String)
                            {
                                var toolName = funcProp.GetString();
                                if (!string.IsNullOrEmpty(toolName))
                                {
                                    var args = new Dictionary<string, object>();

                                    // Extract parameters
                                    if (root.TryGetProperty("parameters", out var paramsProp) && 
                                        paramsProp.ValueKind == JsonValueKind.Object)
                                    {
                                        foreach (var param in paramsProp.EnumerateObject())
                                        {
                                            var value = param.Value.ValueKind switch
                                            {
                                                JsonValueKind.String => param.Value.GetString() ?? "",
                                                JsonValueKind.Number => param.Value.GetRawText(),
                                                _ => param.Value.GetRawText()
                                            };
                                            args[param.Name] = value;
                                        }
                                    }

                                    if (args.Any() || IsParameterlessFunction(toolName))
                                    {
                                        toolCalls.Add((toolName, args));
                                        _logger.LogInformation("Extracted tool call (JSON): {ToolName}", toolName);
                                    }
                                }
                            }
                        }
                        catch (JsonException ex)
                        {
                            _logger.LogDebug(ex, "Failed to parse JSON fragment: {Json}", match.Value);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting tool calls from text");
            }

            return toolCalls;
        }

        private bool IsParameterlessFunction(string functionName)
        {
            return functionName == "get_page_posts";
        }

        private FunctionTool CreateLocalTool(string name, string description, (string paramName, string paramType, string paramDesc, bool required)[] parameters)
        {
            var props = new Dictionary<string, PropertyDefinition>();
            var required = new List<string>();

            foreach (var (paramName, paramType, paramDesc, isRequired) in parameters)
            {
                props[paramName] = new PropertyDefinition
                {
                    Type = paramType,
                    Description = paramDesc
                };
                if (isRequired)
                {
                    required.Add(paramName);
                }
            }

            return new FunctionTool
            {
                Type = "function",
                Function = new FunctionDefinition
                {
                    Name = name,
                    Description = description,
                    Parameters = new ParametersSchema
                    {
                        Type = "object",
                        Properties = props,
                        Required = required
                    }
                }
            };
        }
    }
}

