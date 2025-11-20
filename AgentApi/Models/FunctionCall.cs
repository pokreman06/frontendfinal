using System.Text.Json.Serialization;

namespace AgentApi.Models
{
    public class FunctionCall
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("arguments")]
        public string Arguments { get; set; } = string.Empty;
    }
}