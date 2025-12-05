using System.Collections.Generic;

namespace AgentApi.Models
{
    public class AgentRequest
    {
        public string UserMessage { get; set; } = string.Empty;
        public List<Message>? ConversationHistory { get; set; }
        public string? Model { get; set; }
        public List<string>? AllowedTools { get; set; } // Optional: Filter which tools the agent can use
    }
}