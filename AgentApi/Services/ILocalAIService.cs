using AgentApi.Models;
using System.Threading.Tasks;

namespace AgentApi.Services
{
    public interface ILocalAIService
    {
        Task<LocalAIResponse> SendMessageAsync(LocalAIRequest request);
    }
}