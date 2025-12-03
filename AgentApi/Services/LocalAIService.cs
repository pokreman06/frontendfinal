using AgentApi.Models;
using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace AgentApi.Services
{
    public class LocalAIService : ILocalAIService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<LocalAIService> _logger;

        public LocalAIService(HttpClient httpClient, ILogger<LocalAIService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
        }

        public async Task<LocalAIResponse> SendMessageAsync(LocalAIRequest request)
        {
            try
            {
                _logger.LogInformation("Sending request to local AI with {MessageCount} messages", 
                    request.Messages.Count);

                var response = await _httpClient.PostAsJsonAsync("v1/chat/completions", request);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("AI API error: {StatusCode} - {Error}", 
                        response.StatusCode, errorContent);
                    throw new Exception($"AI API returned {response.StatusCode}: {errorContent}");
                }
                
                var result = await response.Content.ReadFromJsonAsync<LocalAIResponse>();
                return result ?? throw new Exception("Failed to deserialize AI response");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling local AI API");
                throw new Exception($"Error calling local AI API: {ex.Message}", ex);
            }
        }
    }
}

