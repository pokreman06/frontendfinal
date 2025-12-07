using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using AgentApi.Models;

namespace AgentApi.Services
{
    /// <summary>
    /// Extracts tool calls from various formats (ACTION format, JSON, etc).
    /// Responsible for parsing and translating AI responses into executable tool calls.
    /// </summary>
    public interface IToolCallExtractor
    {
        List<(string toolName, Dictionary<string, object> args)> ExtractToolCalls(
            string content,
            List<FunctionTool> availableTools);
        
        bool IsParameterlessFunction(string functionName);
    }

    public class ToolCallExtractor : IToolCallExtractor
    {
        private readonly ILogger<ToolCallExtractor> _logger;
        private const string ParameterlessFunctionName = "get_page_posts";

        public ToolCallExtractor(ILogger<ToolCallExtractor> logger)
        {
            _logger = logger;
        }

        /// <summary>
        /// Extracts tool calls from AI response content in multiple formats.
        /// Attempts ACTION format first, falls back to JSON parsing.
        /// </summary>
        public List<(string toolName, Dictionary<string, object> args)> ExtractToolCalls(
            string content,
            List<FunctionTool> availableTools)
        {
            if (string.IsNullOrWhiteSpace(content))
            {
                return new List<(string, Dictionary<string, object>)>();
            }

            try
            {
                _logger.LogDebug("Extracting tool calls from content");

                // Try the ACTION format first (most reliable for custom models)
                var actionToolCalls = ExtractActionFormatToolCalls(content);
                if (actionToolCalls.Count > 0)
                {
                    _logger.LogInformation("Extracted {Count} tool calls from ACTION format", actionToolCalls.Count);
                    return actionToolCalls;
                }

                // Fallback: try JSON parsing (for OpenAI function format)
                var jsonToolCalls = ExtractJsonFormatToolCalls(content);
                if (jsonToolCalls.Count > 0)
                {
                    _logger.LogInformation("Extracted {Count} tool calls from JSON format", jsonToolCalls.Count);
                    return jsonToolCalls;
                }

                _logger.LogDebug("No tool calls found in content");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error extracting tool calls from text");
            }

            return new List<(string, Dictionary<string, object>)>();
        }

        /// <summary>
        /// Checks if a function doesn't require parameters.
        /// </summary>
        public bool IsParameterlessFunction(string functionName)
        {
            return functionName == ParameterlessFunctionName;
        }

        /// <summary>
        /// Extracts tool calls from ACTION format.
        /// Format: ACTION: tool_name
        ///         PARAMETERS:
        ///         key=value
        ///         EXPLANATION: description
        /// </summary>
        private List<(string toolName, Dictionary<string, object> args)> ExtractActionFormatToolCalls(string content)
        {
            var toolCalls = new List<(string, Dictionary<string, object>)>();

            try
            {
                var lines = content.Split(new[] { "\n", "\r\n" }, StringSplitOptions.None);
                string? currentAction = null;
                var currentParams = new Dictionary<string, object>();

                foreach (var line in lines)
                {
                    var trimmed = line.Trim();

                    if (trimmed.StartsWith("ACTION:", StringComparison.OrdinalIgnoreCase))
                    {
                        // Save previous action if any
                        if (!string.IsNullOrEmpty(currentAction) &&
                            (currentParams.Any() || IsParameterlessFunction(currentAction)))
                        {
                            toolCalls.Add((currentAction, currentParams));
                            _logger.LogDebug("Extracted ACTION: {Action} with {ParamCount} parameters",
                                currentAction, currentParams.Count);
                        }

                        currentAction = trimmed.Substring("ACTION:".Length).Trim();
                        currentParams = new Dictionary<string, object>();
                    }
                    else if (trimmed.StartsWith("PARAMETERS:", StringComparison.OrdinalIgnoreCase))
                    {
                        // Parameters section starts - just continue to next line
                        continue;
                    }
                    else if (trimmed.StartsWith("EXPLANATION:", StringComparison.OrdinalIgnoreCase))
                    {
                        // End of current action block
                        if (!string.IsNullOrEmpty(currentAction) &&
                            (currentParams.Any() || IsParameterlessFunction(currentAction)))
                        {
                            toolCalls.Add((currentAction, currentParams));
                            _logger.LogDebug("Extracted ACTION: {Action} with {ParamCount} parameters",
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
                            _logger.LogDebug("Parsed parameter: {Key}={Value}", key, value);
                        }
                    }
                }

                // Add last action if any
                if (!string.IsNullOrEmpty(currentAction) &&
                    (currentParams.Any() || IsParameterlessFunction(currentAction)))
                {
                    toolCalls.Add((currentAction, currentParams));
                    _logger.LogDebug("Extracted ACTION: {Action} with {ParamCount} parameters",
                        currentAction, currentParams.Count);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract ACTION format tool calls");
            }

            return toolCalls;
        }

        /// <summary>
        /// Extracts tool calls from JSON format.
        /// Expected structure: { "function": "tool_name", "parameters": { "key": "value" } }
        /// </summary>
        private List<(string toolName, Dictionary<string, object> args)> ExtractJsonFormatToolCalls(string content)
        {
            var toolCalls = new List<(string, Dictionary<string, object>)>();

            try
            {
                // Regex pattern to find JSON objects
                var jsonPattern = @"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}";
                var matches = Regex.Matches(content, jsonPattern);

                foreach (Match match in matches)
                {
                    try
                    {
                        var jsonStr = match.Value;
                        using var doc = JsonDocument.Parse(jsonStr);
                        var root = doc.RootElement;

                        // Look for "function" property
                        if (root.TryGetProperty("function", out var funcProp) &&
                            funcProp.ValueKind == JsonValueKind.String)
                        {
                            var toolName = funcProp.GetString();
                            if (!string.IsNullOrEmpty(toolName))
                            {
                                var args = ExtractJsonParameters(root);

                                if (args.Any() || IsParameterlessFunction(toolName))
                                {
                                    toolCalls.Add((toolName, args));
                                    _logger.LogDebug("Extracted JSON tool call: {ToolName} with {ParamCount} parameters",
                                        toolName, args.Count);
                                }
                            }
                        }
                    }
                    catch (JsonException ex)
                    {
                        _logger.LogDebug(ex, "Failed to parse JSON fragment: {Json}", 
                            match.Value.Substring(0, Math.Min(50, match.Value.Length)));
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract JSON format tool calls");
            }

            return toolCalls;
        }

        /// <summary>
        /// Extracts parameters from JSON object element.
        /// Looks for "parameters" property and converts to Dictionary<string, object>.
        /// </summary>
        private Dictionary<string, object> ExtractJsonParameters(JsonElement root)
        {
            var args = new Dictionary<string, object>();

            try
            {
                if (root.TryGetProperty("parameters", out var paramsProp) &&
                    paramsProp.ValueKind == JsonValueKind.Object)
                {
                    foreach (var param in paramsProp.EnumerateObject())
                    {
                        var value = param.Value.ValueKind switch
                        {
                            JsonValueKind.String => param.Value.GetString() ?? "",
                            JsonValueKind.Number => param.Value.GetRawText(),
                            JsonValueKind.True => "true",
                            JsonValueKind.False => "false",
                            JsonValueKind.Null => "null",
                            _ => param.Value.GetRawText()
                        };
                        args[param.Name] = value;
                        _logger.LogDebug("Extracted parameter: {Key}={Value}", param.Name, value);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract JSON parameters");
            }

            return args;
        }
    }
}
