using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace AgentApi.Models
{
    public class LocalAIResponse
    {
        [JsonPropertyName("id")]
        public string Id { get; set; } = string.Empty;

        [JsonPropertyName("choices")]
        public List<Choice> Choices { get; set; } = new();

        [JsonPropertyName("model")]
        public string Model { get; set; } = string.Empty;
    }
}