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
using Microsoft.EntityFrameworkCore;
using Contexts;

namespace AgentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AgentController : ControllerBase
    {
        private readonly ILocalAIService _aiService;
        private readonly ILogger<AgentController> _logger;
        private readonly MyDbContext _context;
        private readonly IToolOrchestrator _toolOrchestrator;

        private const string SYSTEM_MESSAGE = @"You are a helpful AI assistant. When you need to perform actions, respond with this format:

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

Always use this exact format when you need to perform an action.";

        public AgentController(
            ILocalAIService aiService,
            ILogger<AgentController> logger,
            MyDbContext context,
            IToolOrchestrator toolOrchestrator)
        {
            _aiService = aiService;
            _logger = logger;
            _context = context;
            _toolOrchestrator = toolOrchestrator;
        }

        [HttpPost("chat")]
        public async Task<ActionResult<AgentResponse>> Chat([FromBody] AgentRequest request)
        {
            try
            {
                // Initialize and get all available tools
                var (mcpTools, localTools, allTools) = await _toolOrchestrator.InitializeToolsAsync(request);

                // Build conversation history with system message
                var messages = request.ConversationHistory ?? new List<Message>();

                // Add system message at the beginning if not already present
                if (messages.Count == 0 || messages[0].Role != "system")
                {
                    var systemMessage = new Message
                    {
                        Role = "system",
                        Content = SYSTEM_MESSAGE
                    };
                    messages.Insert(0, systemMessage);
                }

                if (string.IsNullOrEmpty(request.UserMessage))
                {
                    return BadRequest("User message cannot be empty");
                }

                // Check if user message already contains ACTION format - execute directly
                var directActionResponse = await HandleDirectActionAsync(request.UserMessage, mcpTools, messages);
                if (directActionResponse != null)
                {
                    return directActionResponse;
                }

                messages.Add(new Message
                {
                    Role = "user",
                    Content = request.UserMessage
                });

                // Delegate conversation loop to orchestrator
                var response = await _toolOrchestrator.ProcessConversationLoopAsync(
                    messages,
                    request,
                    allTools,
                    mcpTools);

                return response != null
                    ? Ok(response)
                    : BadRequest("Max iterations reached - possible infinite tool loop");
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
                var request = new AgentRequest();
                var (_, _, allTools) = await _toolOrchestrator.InitializeToolsAsync(request);
                return Ok(allTools);
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


        private string EnhanceQueryWithThemes(string query)
        {
            try
            {
                // Only load selected themes
                var themes = _context.QueryThemes
                    .Where(q => q.Selected)
                    .Select(q => q.Text)
                    .ToList();
                if (themes.Any())
                {
                    var themesStr = string.Join(" ", themes);
                    _logger.LogInformation("Enhancing query '{Query}' with {Count} selected themes: {Themes}", query, themes.Count, themesStr);
                    return $"{query} {themesStr}";
                }
                else
                {
                    _logger.LogInformation("No selected themes found, using original query: {Query}", query);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load query themes, using original query");
            }
            return query;
        }

        private async Task<ActionResult<AgentResponse>?> HandleDirectActionAsync(string userMessage, List<FunctionTool> mcpTools, List<Message> messages)
        {
            if (!userMessage.Contains("ACTION:") || !userMessage.Contains("PARAMETERS:"))
            {
                return null;
            }

            _logger.LogInformation("Direct ACTION command detected in user message");
            var toolCalls = _toolOrchestrator.ExtractToolCalls(userMessage, mcpTools);

            if (toolCalls.Count == 0)
            {
                return null;
            }

            var (directFunctionExecutions, toolResults) = await _toolOrchestrator.ExecuteToolCallsAsync(toolCalls);

            return Ok(new AgentResponse
            {
                Response = string.Join("\n", toolResults),
                ConversationHistory = messages,
                UsedMcp = true,
                ToolsUsed = toolCalls.Select(t => t.toolName).ToList(),
                FunctionExecutions = directFunctionExecutions
            });
        }

        private async Task LogToolCallAsync(string toolName, string query, object arguments, object result, long? durationMs = null)
        {
            try
            {
                var toolCall = new AgentToolCall
                {
                    ToolName = toolName,
                    Query = query,
                    Arguments = JsonSerializer.Serialize(arguments),
                    Result = JsonSerializer.Serialize(result),
                    ExecutedAt = DateTime.UtcNow,
                    DurationMs = durationMs
                };

                _context.ToolCalls.Add(toolCall);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to log tool call for {ToolName}", toolName);
            }
        }
    }
}

