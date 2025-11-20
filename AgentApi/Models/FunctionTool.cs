using System.Text.Json.Serialization;

namespace AgentApi.Models
{
    public class FunctionTool
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = "function";

        [JsonPropertyName("function")]
        public FunctionDefinition Function { get; set; } = new();
    }
}