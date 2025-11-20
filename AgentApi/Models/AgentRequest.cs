using System.Collections.Generic;

namespace AgentApi.Models
{
    public class AgentRequest
    {
        public string UserMessage { get; set; } = string.Empty;
        public List<Message>? ConversationHistory { get; set; }
        public string? Model { get; set; }
    }
}