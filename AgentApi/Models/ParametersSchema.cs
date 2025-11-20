using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace AgentApi.Models
{
    public class ParametersSchema
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = "object";

        [JsonPropertyName("properties")]
        public Dictionary<string, PropertyDefinition> Properties { get; set; } = new();

        [JsonPropertyName("required")]
        public List<string> Required { get; set; } = new();
    }
}