using System.Text.Json.Serialization;

namespace AgentApi.Models
{
    public class FunctionDefinition
    {
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("parameters")]
        public ParametersSchema Parameters { get; set; } = new();
    }
}
