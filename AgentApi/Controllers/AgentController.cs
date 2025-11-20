using AgentApi.Models;
using AgentApi.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
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

        public AgentController(
            ILocalAIService aiService, 
            IMcpClient mcpClient,
            ILogger<AgentController> logger)
        {
            _aiService = aiService;
            _mcpClient = mcpClient;
            _logger = logger;
        }

        [HttpPost("chat")]
        public async Task<ActionResult<AgentResponse>> Chat([FromBody] AgentRequest request)
        {
            try
            {
                // Get available MCP tools
                var mcpTools = await _mcpClient.GetAvailableToolsAsync();
                _logger.LogInformation("Available MCP tools: {Count}", mcpTools.Count);

                // Build conversation history
                var messages = request.ConversationHistory ?? new List<Message>();
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

                    // Create AI request with MCP tools
                    var aiRequest = new LocalAIRequest
                    {
                        Model = request.Model ?? "default",
                        Messages = messages,
                        Tools = mcpTools.Count > 0 ? mcpTools : null,
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

                    // Add assistant message to history
                    messages.Add(assistantMessage);

                    // Check if AI wants to use tools
                    if (choice.FinishReason == "tool_calls" && assistantMessage.ToolCalls != null)
                    {
                        usedMcp = true;
                        _logger.LogInformation("AI requested {Count} tool calls", 
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

                                // Execute MCP tool
                                var result = await _mcpClient.ExecuteToolAsync(toolName, args);

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

                    // No more tool calls, we have final response
                    var finalResponse = assistantMessage.Content;

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
    }
}

