using System.Text.Json.Serialization;

namespace AgentApi.Models
{
    public class Choice
    {
        [JsonPropertyName("index")]
        public int Index { get; set; }

        [JsonPropertyName("message")]
        public Message Message { get; set; } = new();

        [JsonPropertyName("finish_reason")]
        public string FinishReason { get; set; } = string.Empty;
    }
}