using System.Collections.Generic;

namespace AgentApi.Models
{
    public class AgentResponse
    {
        public string Response { get; set; } = string.Empty;
        public List<Message> ConversationHistory { get; set; } = new();
        public bool UsedMcp { get; set; }
        public List<string>? ToolsUsed { get; set; }
    }
}
