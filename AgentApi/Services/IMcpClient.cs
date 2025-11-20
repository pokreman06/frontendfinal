using System.Collections.Generic;
using System.Threading.Tasks;
using AgentApi.Models;

namespace AgentApi.Services
{
    public interface IMcpClient
    {
        Task<List<FunctionTool>> GetAvailableToolsAsync();
        Task<string> ExecuteToolAsync(string toolName, Dictionary<string, object> parameters);
    }
}