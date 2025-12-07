using AgentApi.Models;
using AgentApi.Services.SearchValidation;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Contexts;

namespace AgentApi.Services
{
    /// <summary>
    /// Orchestrates tool execution for AI agent responses.
    /// Handles parsing, validation, and execution of tool calls.
    /// </summary>
    public interface IToolOrchestrator
    {
        Task<ToolExecutionResult> ExecuteToolAsync(string toolName, Dictionary<string, object> args);
        Task<(List<FunctionExecutionResult> executions, List<string> results)> ExecuteToolCallsAsync(List<(string toolName, Dictionary<string, object> args)> toolCalls);
        List<(string toolName, Dictionary<string, object> args)> ExtractToolCalls(string content, List<FunctionTool> availableTools);
        bool IsParameterlessFunction(string functionName);
        Task<(List<FunctionTool> mcpTools, List<FunctionTool> localTools, List<FunctionTool> allTools)> InitializeToolsAsync(AgentRequest request);
        Task<AgentResponse?> ProcessConversationLoopAsync(List<Message> messages, AgentRequest request, List<FunctionTool> allTools, List<FunctionTool> mcpTools);
    }

    public class ToolOrchestrator : IToolOrchestrator
    {
        private readonly ILocalAIService _aiService;
        private readonly IMcpClient _mcpClient;
        private readonly PromptSearcher _searcher;
        private readonly WebPageFetcher _pageFetcher;
        private readonly IToolCallExtractor _toolCallExtractor;
        private readonly MyDbContext _context;
        private readonly ILogger<ToolOrchestrator> _logger;

        public ToolOrchestrator(
            ILocalAIService aiService,
            IMcpClient mcpClient,
            PromptSearcher searcher,
            WebPageFetcher pageFetcher,
            IToolCallExtractor toolCallExtractor,
            MyDbContext context,
            ILogger<ToolOrchestrator> logger)
        {
            _aiService = aiService;
            _mcpClient = mcpClient;
            _searcher = searcher;
            _pageFetcher = pageFetcher;
            _toolCallExtractor = toolCallExtractor;
            _context = context;
            _logger = logger;
        }

        /// <summary>
        /// Executes multiple tool calls and returns both execution results and formatted result strings.
        /// </summary>
        public async Task<(List<FunctionExecutionResult> executions, List<string> results)> ExecuteToolCallsAsync(List<(string toolName, Dictionary<string, object> args)> toolCalls)
        {
            var executions = new List<FunctionExecutionResult>();
            var results = new List<string>();

            foreach (var (toolName, args) in toolCalls)
            {
                try
                {
                    var orchestratorResult = await ExecuteToolAsync(toolName, args);

                    executions.Add(new FunctionExecutionResult
                    {
                        FunctionName = orchestratorResult.FunctionName,
                        Parameters = orchestratorResult.Parameters ?? new Dictionary<string, object>(),
                        Success = orchestratorResult.Success,
                        Result = orchestratorResult.Result,
                        ErrorMessage = orchestratorResult.ErrorMessage
                    });

                    if (orchestratorResult.Success)
                    {
                        results.Add($"Successfully executed {toolName}: {orchestratorResult.Result}");
                        _logger.LogInformation("Tool {Tool} executed successfully", toolName);
                    }
                    else
                    {
                        results.Add($"Error executing {toolName}: {orchestratorResult.ErrorMessage}");
                        _logger.LogWarning("Tool {Tool} execution failed: {Error}", toolName, orchestratorResult.ErrorMessage);
                    }
                }
                catch (Exception ex)
                {
                    executions.Add(new FunctionExecutionResult
                    {
                        FunctionName = toolName,
                        Parameters = args,
                        Success = false,
                        ErrorMessage = ex.Message,
                        Result = $"{{\"error\": \"{ex.Message}\"}}"
                    });
                    _logger.LogError(ex, "Error executing tool {Tool}", toolName);
                    results.Add($"Error executing {toolName}: {ex.Message}");
                }
            }

            return (executions, results);
        }

        /// <summary>
        /// Executes a tool call and returns the result.
        /// </summary>
        public async Task<ToolExecutionResult> ExecuteToolAsync(string toolName, Dictionary<string, object> args)
        {
            var result = new ToolExecutionResult
            {
                FunctionName = toolName,
                Parameters = args,
                ExecutedAt = DateTime.UtcNow
            };

            try
            {
                string toolResult;

                // Handle web_search locally
                if (toolName == "web_search")
                {
                    toolResult = await HandleWebSearchAsync(args);
                }
                // Handle fetch_page locally
                else if (toolName == "fetch_page")
                {
                    toolResult = await HandleFetchPageAsync(args);
                }
                else
                {
                    // Execute MCP tool
                    toolResult = await _mcpClient.ExecuteToolAsync(toolName, args);
                }

                result.Success = true;
                result.Result = toolResult;
                _logger.LogInformation("Tool {ToolName} executed successfully", toolName);
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.ErrorMessage = ex.Message;
                result.Result = $"{{\"error\": \"{ex.Message}\"}}";
                _logger.LogError(ex, "Error executing tool {ToolName}", toolName);
            }

            return result;
        }

        /// <summary>
        /// Extracts tool calls from AI response content in multiple formats.
        /// Supports ACTION format and JSON structures.
        /// </summary>
        public List<(string toolName, Dictionary<string, object> args)> ExtractToolCalls(
            string content,
            List<FunctionTool> availableTools)
        {
            return _toolCallExtractor.ExtractToolCalls(content, availableTools);
        }

        /// <summary>
        /// Checks if a function doesn't require parameters.
        /// </summary>
        public bool IsParameterlessFunction(string functionName)
        {
            return _toolCallExtractor.IsParameterlessFunction(functionName);
        }

        /// <summary>
        /// Processes the main conversation loop with the AI, handling tool calls and responses.
        /// </summary>
        public async Task<AgentResponse?> ProcessConversationLoopAsync(
            List<Message> messages,
            AgentRequest request,
            List<FunctionTool> allTools,
            List<FunctionTool> mcpTools)
        {
            var maxIterations = 10;
            var iteration = 0;
            var usedMcp = false;
            var toolsUsed = new List<string>();
            var functionExecutions = new List<FunctionExecutionResult>();

            while (iteration < maxIterations)
            {
                iteration++;

                // Validate all messages have content and check for consecutive assistant messages
                foreach (var msg in messages)
                {
                    if (msg.Role != "tool" && string.IsNullOrEmpty(msg.Content))
                    {
                        _logger.LogWarning("Message with role '{Role}' has empty content", msg.Role);
                        msg.Content = msg.Content ?? "";
                    }
                }

                // Prevent consecutive assistant messages by removing any duplicate assistant messages
                for (int i = messages.Count - 1; i > 0; i--)
                {
                    if (messages[i].Role == "assistant" && messages[i - 1].Role == "assistant")
                    {
                        _logger.LogWarning("Found consecutive assistant messages at indices {Idx1} and {Idx2}, removing the later one", i - 1, i);
                        messages.RemoveAt(i);
                    }
                }

                // Log current message state
                var msgSummary = string.Join(", ", messages.Select(m => $"{m.Role}({(m.Content?.Length ?? 0)} chars)"));
                _logger.LogInformation("Sending {Count} messages to AI: {Summary}", messages.Count, msgSummary);

                // Create AI request
                var aiRequest = new LocalAIRequest
                {
                    Model = request.Model ?? "default",
                    Messages = messages,
                    Tools = null,
                    MaxTokens = 2048
                };

                // Send to local AI
                var aiResponse = await _aiService.SendMessageAsync(aiRequest);

                if (aiResponse.Choices == null || aiResponse.Choices.Count == 0)
                {
                    return null;
                }

                var choice = aiResponse.Choices[0];
                var assistantMessage = choice.Message;

                // Clean up response content
                if (!string.IsNullOrEmpty(assistantMessage.Content))
                {
                    var cleanedContent = System.Text.RegularExpressions.Regex.Replace(
                        assistantMessage.Content,
                        @"<\|[^|]+\|>",
                        "");

                    if (cleanedContent.Contains("functions.web_search") || cleanedContent.Contains("functions.fetch_page"))
                    {
                        _logger.LogWarning("AI returned function call in text format instead of tool_calls. Raw content: {Content}",
                            assistantMessage.Content.Substring(0, Math.Min(200, assistantMessage.Content.Length)));

                        assistantMessage.Content = "I apologize, but I encountered an issue processing your request. Let me try a different approach - could you rephrase your question?";
                    }
                    else
                    {
                        assistantMessage.Content = cleanedContent.Trim();
                    }
                }

                // Handle ACTION format in content
                var hasActionInContent = !string.IsNullOrEmpty(assistantMessage.Content) &&
                                        assistantMessage.Content.Contains("ACTION:") &&
                                        assistantMessage.Content.Contains("PARAMETERS:");

                if (hasActionInContent)
                {
                    usedMcp = true;
                    _logger.LogInformation("AI returned ACTION format in content");

                    var toolCalls = ExtractToolCalls(assistantMessage.Content ?? "", allTools);

                    if (toolCalls.Count > 0)
                    {
                        foreach (var (toolName, args) in toolCalls)
                        {
                            toolsUsed.Add(toolName);

                            try
                            {
                                var orchestratorResult = await ExecuteToolAsync(toolName, args);

                                functionExecutions.Add(new FunctionExecutionResult
                                {
                                    FunctionName = orchestratorResult.FunctionName,
                                    Parameters = orchestratorResult.Parameters ?? new Dictionary<string, object>(),
                                    Success = orchestratorResult.Success,
                                    Result = orchestratorResult.Result,
                                    ErrorMessage = orchestratorResult.ErrorMessage
                                });

                                assistantMessage.Content = orchestratorResult.Success
                                    ? $"Tool {toolName} executed. Result: {orchestratorResult.Result}"
                                    : $"Error executing tool {toolName}: {orchestratorResult.ErrorMessage}";
                            }
                            catch (Exception ex)
                            {
                                functionExecutions.Add(new FunctionExecutionResult
                                {
                                    FunctionName = toolName,
                                    Parameters = args,
                                    Success = false,
                                    ErrorMessage = ex.Message,
                                    Result = $"{{\"error\": \"{ex.Message}\"}}"
                                });
                                _logger.LogError(ex, "Error executing tool {ToolName}", toolName);
                                assistantMessage.Content = $"Error executing tool {toolName}: {ex.Message}";
                            }
                        }
                    }

                    // Add assistant message AFTER processing tools
                    messages.Add(assistantMessage);
                    continue;
                }

                // Check if AI wants to use tools (proper OpenAI format)
                if (choice.FinishReason == "tool_calls" && assistantMessage.ToolCalls != null)
                {
                    usedMcp = true;
                    _logger.LogInformation("AI requested {Count} tool calls via tool_calls",
                        assistantMessage.ToolCalls.Count);

                    // Add assistant message with tool calls to history BEFORE executing tools
                    messages.Add(assistantMessage);

                    // Execute each tool call
                    foreach (var toolCall in assistantMessage.ToolCalls)
                    {
                        var toolName = toolCall.Function.Name;
                        toolsUsed.Add(toolName);

                        try
                        {
                            var args = JsonSerializer.Deserialize<Dictionary<string, object>>(
                                toolCall.Function.Arguments) ?? new Dictionary<string, object>();

                            var orchestratorResult = await ExecuteToolAsync(toolName, args);

                            functionExecutions.Add(new FunctionExecutionResult
                            {
                                FunctionName = orchestratorResult.FunctionName,
                                Parameters = orchestratorResult.Parameters ?? new Dictionary<string, object>(),
                                Success = orchestratorResult.Success,
                                Result = orchestratorResult.Result,
                                ErrorMessage = orchestratorResult.ErrorMessage
                            });

                            messages.Add(new Message
                            {
                                Role = "tool",
                                Content = orchestratorResult.Result,
                                ToolCallId = toolCall.Id,
                                Name = toolName
                            });

                            _logger.LogInformation("Tool {Tool} executed successfully", toolName);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error executing tool {Tool}", toolName);

                            functionExecutions.Add(new FunctionExecutionResult
                            {
                                FunctionName = toolName,
                                Success = false,
                                ErrorMessage = ex.Message,
                                Result = $"{{\"error\": \"{ex.Message}\"}}"
                            });

                            messages.Add(new Message
                            {
                                Role = "tool",
                                Content = $"Error executing tool: {ex.Message}",
                                ToolCallId = toolCall.Id,
                                Name = toolName
                            });
                        }
                    }

                    continue;
                }

                // Check if AI's response contains tool call instructions
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

                    var toolCalls = ExtractToolCalls(assistantMessage.Content ?? "", mcpTools);

                    if (toolCalls.Count > 0)
                    {
                        var toolResults = new List<string>();

                        foreach (var (toolName, args) in toolCalls)
                        {
                            toolsUsed.Add(toolName);

                            try
                            {
                                var orchestratorResult = await ExecuteToolAsync(toolName, args);
                                toolResults.Add($"Tool '{toolName}' result: {orchestratorResult.Result}");

                                functionExecutions.Add(new FunctionExecutionResult
                                {
                                    FunctionName = orchestratorResult.FunctionName,
                                    Parameters = orchestratorResult.Parameters ?? new Dictionary<string, object>(),
                                    Success = orchestratorResult.Success,
                                    Result = orchestratorResult.Result,
                                    ErrorMessage = orchestratorResult.ErrorMessage
                                });

                                _logger.LogInformation("Tool {Tool} executed successfully from text extraction", toolName);
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Error executing tool {Tool}", toolName);
                                toolResults.Add($"Tool '{toolName}' error: {ex.Message}");

                                functionExecutions.Add(new FunctionExecutionResult
                                {
                                    FunctionName = toolName,
                                    Parameters = args,
                                    Success = false,
                                    ErrorMessage = ex.Message,
                                    Result = $"{{\"error\": \"{ex.Message}\"}}"
                                });
                            }
                        }

                        var toolResultText = string.Join("\n", toolResults);
                        return new AgentResponse
                        {
                            Response = $"{assistantMessage.Content}\n\n{toolResultText}",
                            ConversationHistory = messages,
                            UsedMcp = usedMcp,
                            ToolsUsed = toolsUsed.Distinct().ToList(),
                            FunctionExecutions = functionExecutions
                        };
                    }
                }

                // No more tool calls, we have final response
                // Make sure assistant message is in history
                if (!messages.Contains(assistantMessage))
                {
                    messages.Add(assistantMessage);
                }

                var finalResponse = assistantMessage.Content ?? "No response generated";

                return new AgentResponse
                {
                    Response = finalResponse,
                    ConversationHistory = messages,
                    UsedMcp = usedMcp,
                    ToolsUsed = toolsUsed.Distinct().ToList(),
                    FunctionExecutions = functionExecutions
                };
            }

            return null;
        }

        /// <summary>
        /// Initializes and retrieves all available tools, filtering based on request or database settings.
        /// </summary>
        public async Task<(List<FunctionTool> mcpTools, List<FunctionTool> localTools, List<FunctionTool> allTools)> InitializeToolsAsync(AgentRequest request)
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

            // Filter tools: prioritize AllowedTools from request, then fall back to database settings
            if (request.AllowedTools != null && request.AllowedTools.Count > 0)
            {
                allTools = allTools.Where(t => request.AllowedTools.Contains(t.Function.Name)).ToList();
                _logger.LogInformation("Filtered to {Count} allowed tools (from request): {Tools}",
                    allTools.Count, string.Join(", ", allTools.Select(t => t.Function.Name)));
            }
            else
            {
                // Fall back to database tool settings
                var enabledToolNames = await _context.ToolSettings
                    .Where(t => t.IsEnabled)
                    .Select(t => t.ToolName)
                    .ToListAsync();

                if (enabledToolNames.Count > 0)
                {
                    allTools = allTools.Where(t => enabledToolNames.Contains(t.Function.Name)).ToList();
                    _logger.LogInformation("Filtered to {Count} enabled tools (from database): {Tools}",
                        allTools.Count, string.Join(", ", allTools.Select(t => t.Function.Name)));
                }
                else
                {
                    // If no tools are enabled in database, use all tools by default
                    _logger.LogInformation("No tool settings configured, using all {Count} available tools", allTools.Count);
                }
            }

            _logger.LogInformation("Final tool set: {LocalCount} local + {McpCount} MCP = {Total} total",
                localTools.Count, mcpTools.Count, allTools.Count);

            return (mcpTools, localTools, allTools);
        }

        private FunctionTool CreateLocalTool(string name, string description, (string paramName, string paramType, string paramDesc, bool isRequired)[] parameters)
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

        private async Task<string> HandleWebSearchAsync(Dictionary<string, object> args)
        {
            if (!args.TryGetValue("query", out var queryObj) || queryObj is not string query)
            {
                return JsonSerializer.Serialize(new { error = "Missing query parameter" });
            }

            string? fileType = null;
            if (args.TryGetValue("file_type", out var fileTypeObj) && fileTypeObj is string ft)
            {
                fileType = ft;
            }

            var searchResults = await _searcher.GetQuery(query, fileType);
            _logger.LogInformation("Web search executed: {Query}, file_type: {FileType}, found {Count} results",
                query, fileType ?? "none", searchResults.Count);

            return JsonSerializer.Serialize(new { results = searchResults, originalQuery = query });
        }

        private async Task<string> HandleFetchPageAsync(Dictionary<string, object> args)
        {
            if (!args.TryGetValue("url", out var urlObj) || urlObj is not string url)
            {
                return JsonSerializer.Serialize(new { error = "Missing url parameter" });
            }

            var pageContent = await _pageFetcher.FetchPageContent(url);
            _logger.LogInformation("Page fetched from: {Url}", url);

            return JsonSerializer.Serialize(new { url = url, content = pageContent });
        }
    }

    /// <summary>
    /// Result of a tool execution.
    /// </summary>
    public class ToolExecutionResult
    {
        public string FunctionName { get; set; } = string.Empty;
        public Dictionary<string, object>? Parameters { get; set; }
        public bool Success { get; set; }
        public string Result { get; set; } = string.Empty;
        public string? ErrorMessage { get; set; }
        public DateTime ExecutedAt { get; set; }
    }
}
