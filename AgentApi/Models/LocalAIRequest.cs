using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace AgentApi.Models
{
    public class LocalAIRequest
    {
        [JsonPropertyName("model")]
        public string Model { get; set; } = "default";

        [JsonPropertyName("messages")]
        public List<Message> Messages { get; set; } = new();

        [JsonPropertyName("temperature")]
        public double Temperature { get; set; } = 0.7;

        [JsonPropertyName("max_tokens")]
        public int MaxTokens { get; set; } = 2048;

        [JsonPropertyName("tools")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public List<FunctionTool>? Tools { get; set; }

        [JsonPropertyName("tool_choice")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? ToolChoice { get; set; }
    }
}