using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using AgentApi.Models;
using Microsoft.Extensions.Logging;

namespace AgentApi.Services
{
    public class McpClient : IMcpClient
    {
        private readonly ILogger<McpClient> _logger;
        private readonly HttpClient _httpClient;
        private readonly string _baseUrl;

        public McpClient(ILogger<McpClient> logger, HttpClient httpClient, string? baseUrl = null)
        {
            _logger = logger;
            _httpClient = httpClient;
            _baseUrl = baseUrl ?? "http://facebook-mcp-service:8000";
            _logger.LogInformation("MCP client initialized to connect to {BaseUrl}", _baseUrl);
        }

        public async Task<bool> HealthCheckAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_baseUrl}/health");
                return response.IsSuccessStatusCode;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "MCP service health check failed");
                return false;
            }
        }

        public async Task<List<FunctionTool>> GetAvailableToolsAsync()
        {
            // For HTTP-based service, we return a hardcoded list of available tools
            var tools = new List<FunctionTool>
            {
                CreateTool("post_to_facebook", "Create a new Facebook Page post with a text message", 
                    new[] { ("message", "string") }),
                CreateTool("get_page_posts", "Fetch the most recent posts on the Page", Array.Empty<(string, string)>()),
                CreateTool("get_post_comments", "Retrieve all comments for a given post", 
                    new[] { ("post_id", "string") }),
                CreateTool("reply_to_comment", "Reply to a specific comment on a Facebook post",
                    new[] { ("post_id", "string"), ("comment_id", "string"), ("message", "string") }),
                CreateTool("delete_post", "Delete a specific post from the Facebook Page",
                    new[] { ("post_id", "string") }),
                CreateTool("delete_comment", "Delete a specific comment from the Page",
                    new[] { ("comment_id", "string") }),
                CreateTool("hide_comment", "Hide a comment from public view",
                    new[] { ("comment_id", "string") }),
                CreateTool("get_post_insights", "Fetch all insights metrics for a post",
                    new[] { ("post_id", "string") }),
                CreateTool("post_image_to_facebook", "Post an image with a caption to the Facebook page",
                    new[] { ("image_url", "string"), ("caption", "string") }),
                CreateTool("send_dm_to_user", "Send a direct message to a user",
                    new[] { ("user_id", "string"), ("message", "string") })
            };

            _logger.LogInformation("Loaded {Count} Facebook MCP tools", tools.Count);
            return tools;
        }

        public async Task<string> ExecuteToolAsync(string toolName, Dictionary<string, object> parameters)
        {
            _logger.LogInformation("Executing MCP tool: {ToolName}", toolName);

            try
            {
                // Build the URL with query parameters
                var url = $"{_baseUrl}/api/{ConvertToolNameToEndpoint(toolName)}";
                
                // Add query parameters
                var queryParams = string.Join("&", 
                    parameters.Select(kvp => $"{kvp.Key}={Uri.EscapeDataString(kvp.Value?.ToString() ?? "")}"));
                
                if (!string.IsNullOrEmpty(queryParams))
                    url += $"?{queryParams}";

                HttpResponseMessage response = toolName switch
                {
                    "delete_post" or "delete_comment" => await _httpClient.DeleteAsync(url),
                    "hide_comment" or "unhide_comment" => await _httpClient.PostAsync(url, null),
                    _ => await _httpClient.PostAsync(url, null)
                };

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Tool execution failed: {StatusCode} - {Error}", 
                        response.StatusCode, errorContent);
                    return $"Error: {response.StatusCode} - {errorContent}";
                }

                var content = await response.Content.ReadAsStringAsync();
                return content;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error executing MCP tool: {ToolName}", toolName);
                return $"Error executing tool: {ex.Message}";
            }
        }

        private string ConvertToolNameToEndpoint(string toolName)
        {
            // Convert snake_case tool names to endpoint paths
            return toolName switch
            {
                "post_to_facebook" => "post",
                "reply_to_comment" => "reply",
                "get_page_posts" => "posts",
                "get_post_comments" => "posts/{post_id}/comments",
                "delete_post" => "posts/{post_id}",
                "delete_comment" => "comments/{comment_id}",
                "hide_comment" => "comments/{comment_id}/hide",
                "unhide_comment" => "comments/{comment_id}/unhide",
                "get_post_insights" => "posts/{post_id}/insights",
                "post_image_to_facebook" => "post-image",
                "send_dm_to_user" => "messages",
                "get_page_fan_count" => "stats",
                _ => toolName.Replace("_", "-")
            };
        }

        private FunctionTool CreateTool(string name, string description, (string, string)[] parameters)
        {
            var props = new Dictionary<string, PropertyDefinition>();
            var required = new List<string>();

            foreach (var (paramName, paramType) in parameters)
            {
                var paramDescription = paramName switch
                {
                    "message" => "The text message to post or send",
                    "post_id" => "The unique identifier of the Facebook post",
                    "comment_id" => "The unique identifier of the comment",
                    "image_url" => "The URL of the image to post",
                    "caption" => "The caption text for the image",
                    "user_id" => "The Facebook user ID to send a message to",
                    _ => paramName
                };

                props[paramName] = new PropertyDefinition
                {
                    Type = paramType,
                    Description = paramDescription
                };
                required.Add(paramName);
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