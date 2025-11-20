using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace AgentApi.Models
{
    public class Message
    {
        [JsonPropertyName("role")]
        public string Role { get; set; } = string.Empty;

        [JsonPropertyName("content")]
        public string Content { get; set; } = string.Empty;

        [JsonPropertyName("tool_calls")]
        public List<ToolCall>? ToolCalls { get; set; }

        [JsonPropertyName("tool_call_id")]
        public string? ToolCallId { get; set; }

        [JsonPropertyName("name")]
        public string? Name { get; set; }
    }
}
