using System.Collections.Generic;

namespace AgentApi.Models
{
    public class AgentResponse
    {
        public string Response { get; set; } = string.Empty;
        public List<Message> ConversationHistory { get; set; } = new();
        public bool UsedMcp { get; set; }
        public List<string>? ToolsUsed { get; set; }
        public List<FunctionExecutionResult>? FunctionExecutions { get; set; } // Detailed execution log
    }

    public class FunctionExecutionResult
    {
        public string FunctionName { get; set; } = string.Empty;
        public Dictionary<string, object> Parameters { get; set; } = new();
        public string Result { get; set; } = string.Empty;
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
    }
}
