using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Net.Http;
using System.Threading.Tasks;

namespace AgentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FacebookController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<FacebookController> _logger;
        private readonly string _mcpServiceUrl;

        public FacebookController(IHttpClientFactory httpClientFactory, ILogger<FacebookController> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _mcpServiceUrl = Environment.GetEnvironmentVariable("MCP_SERVICE_URL") ?? "http://facebook-mcp-service:8000";
        }

        [HttpGet("stats")]
        public async Task<IActionResult> GetStats()
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                var response = await client.GetAsync($"{_mcpServiceUrl}/api/stats");
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("MCP service returned error: {StatusCode} - {Error}", response.StatusCode, errorContent);
                    return StatusCode((int)response.StatusCode, new { error = errorContent });
                }

                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Facebook stats");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("posts")]
        public async Task<IActionResult> GetPosts()
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                var response = await client.GetAsync($"{_mcpServiceUrl}/api/posts");
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("MCP service returned error: {StatusCode} - {Error}", response.StatusCode, errorContent);
                    return StatusCode((int)response.StatusCode, new { error = errorContent });
                }

                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting Facebook posts");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("posts/{postId}/insights")]
        public async Task<IActionResult> GetPostInsights(string postId)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                var response = await client.GetAsync($"{_mcpServiceUrl}/api/posts/{postId}/insights");
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("MCP service returned error: {StatusCode} - {Error}", response.StatusCode, errorContent);
                    return StatusCode((int)response.StatusCode, new { error = errorContent });
                }

                var content = await response.Content.ReadAsStringAsync();
                return Content(content, "application/json");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting post insights");
                return StatusCode(500, new { error = ex.Message });
            }
        }
    }
}
