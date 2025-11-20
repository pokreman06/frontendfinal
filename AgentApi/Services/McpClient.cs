using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using AgentApi.Models;
using Microsoft.Extensions.Logging;

namespace AgentApi.Services
{
    public class McpClient : IMcpClient
    {
        private readonly ILogger<McpClient> _logger;
        private Process? _mcpProcess;
        private StreamWriter? _processInput;
        private StreamReader? _processOutput;
        private readonly object _lock = new object();

        public McpClient(ILogger<McpClient> logger)
        {
            _logger = logger;
            InitializeMcpServer();
        }

        private void InitializeMcpServer()
        {
            try
            {
                _mcpProcess = new Process
                {
                    StartInfo = new ProcessStartInfo
            {
                FileName = "python3",
                Arguments = "/app/mcp/server.py",
                UseShellExecute = false,
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
                WorkingDirectory = "/app/mcp"
            }
                };

                _mcpProcess.Start();
                _processInput = _mcpProcess.StandardInput;
                _processOutput = _mcpProcess.StandardOutput;

                _logger.LogInformation("MCP server started successfully");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to start MCP server");
            }
        }

        public async Task<List<FunctionTool>> GetAvailableToolsAsync()
        {
            var request = new
            {
                jsonrpc = "2.0",
                id = 1,
                method = "tools/list"
            };

            await SendMcpRequestAsync(request);
            var response = await ReadMcpResponseAsync();

            return ParseMcpTools(response);
        }

        public async Task<string> ExecuteToolAsync(string toolName, Dictionary<string, object> parameters)
        {
            _logger.LogInformation("Executing MCP tool: {ToolName}", toolName);

            var request = new
            {
                jsonrpc = "2.0",
                id = Guid.NewGuid().ToString(),
                method = "tools/call",
                @params = new
                {
                    name = toolName,
                    arguments = parameters
                }
            };

            await SendMcpRequestAsync(request);
            var response = await ReadMcpResponseAsync();

            return ExtractToolResult(response);
        }

        private async Task SendMcpRequestAsync(object request)
        {
            if (_processInput == null)
                throw new InvalidOperationException("MCP process not initialized");

            lock (_lock)
            {
                var json = JsonSerializer.Serialize(request);
                _processInput.WriteLine(json);
                _processInput.Flush();
            }

            await Task.CompletedTask;
        }

        private async Task<string> ReadMcpResponseAsync()
        {
            if (_processOutput == null)
                throw new InvalidOperationException("MCP process not initialized");

            return await _processOutput.ReadLineAsync() ?? string.Empty;
        }

        private List<FunctionTool> ParseMcpTools(string response)
        {
            var tools = new List<FunctionTool>();
            
            try
            {
                using var doc = JsonDocument.Parse(response);
                var result = doc.RootElement.GetProperty("result");
                var toolsArray = result.GetProperty("tools");

                foreach (var tool in toolsArray.EnumerateArray())
                {
                    var functionTool = new FunctionTool
                    {
                        Type = "function",
                        Function = new FunctionDefinition
                        {
                            Name = tool.GetProperty("name").GetString() ?? "",
                            Description = tool.GetProperty("description").GetString() ?? "",
                            Parameters = new ParametersSchema
                            {
                                Type = "object",
                                Properties = new Dictionary<string, PropertyDefinition>(),
                                Required = new List<string>()
                            }
                        }
                    };

                    if (tool.TryGetProperty("inputSchema", out var schema))
                    {
                        if (schema.TryGetProperty("properties", out var props))
                        {
                            foreach (var prop in props.EnumerateObject())
                            {
                                functionTool.Function.Parameters.Properties[prop.Name] = new PropertyDefinition
                                {
                                    Type = prop.Value.GetProperty("type").GetString() ?? "string",
                                    Description = prop.Value.TryGetProperty("description", out var desc) 
                                        ? desc.GetString() ?? "" 
                                        : ""
                                };
                            }
                        }

                        if (schema.TryGetProperty("required", out var required))
                        {
                            foreach (var req in required.EnumerateArray())
                            {
                                functionTool.Function.Parameters.Required.Add(req.GetString() ?? "");
                            }
                        }
                    }

                    tools.Add(functionTool);
                }

                _logger.LogInformation("Parsed {Count} MCP tools", tools.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing MCP tools");
            }

            return tools;
        }

        private string ExtractToolResult(string response)
        {
            try
            {
                using var doc = JsonDocument.Parse(response);
                
                if (doc.RootElement.TryGetProperty("result", out var result))
                {
                    return JsonSerializer.Serialize(result);
                }
                
                if (doc.RootElement.TryGetProperty("error", out var error))
                {
                    _logger.LogError("MCP tool execution error: {Error}", error.ToString());
                    return $"Error: {error}";
                }

                return response;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting tool result");
                return $"Error parsing result: {ex.Message}";
            }
        }
    }
}