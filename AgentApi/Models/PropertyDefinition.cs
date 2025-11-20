using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace AgentApi.Models
{
    public class PropertyDefinition
    {
        [JsonPropertyName("type")]
        public string Type { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("enum")]
        public List<string>? Enum { get; set; }
    }
}
