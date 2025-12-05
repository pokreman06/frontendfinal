using Microsoft.AspNetCore.Mvc;
using System.Net.Http;
using System.Text.Json;

namespace AgentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<AuthController> _logger;
        private readonly string _keycloakAuthority;

        public AuthController(IHttpClientFactory httpClientFactory, ILogger<AuthController> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
            _keycloakAuthority = Environment.GetEnvironmentVariable("KEYCLOAK_AUTHORITY") 
                                ?? "https://auth-dev.snowse.io/realms/DevRealm";
        }

        [HttpPost("token")]
        [Consumes("application/x-www-form-urlencoded", "application/json")]
        public async Task<IActionResult> ExchangeToken([FromForm] TokenRequest request)
        {
            try
            {
                _logger.LogInformation($"Token exchange request - ClientId: {request.ClientId}, GrantType: {request.GrantType}, HasCode: {!string.IsNullOrEmpty(request.Code)}, HasCodeVerifier: {!string.IsNullOrEmpty(request.CodeVerifier)}");
                
                var httpClient = _httpClientFactory.CreateClient();
                var tokenEndpoint = $"{_keycloakAuthority}/protocol/openid-connect/token";

                var formData = new Dictionary<string, string>
                {
                    { "grant_type", request.GrantType },
                    { "client_id", request.ClientId },
                    { "redirect_uri", request.RedirectUri }
                };

                if (!string.IsNullOrEmpty(request.Code))
                {
                    formData["code"] = request.Code;
                }

                if (!string.IsNullOrEmpty(request.RefreshToken))
                {
                    formData["refresh_token"] = request.RefreshToken;
                }

                if (!string.IsNullOrEmpty(request.CodeVerifier))
                {
                    formData["code_verifier"] = request.CodeVerifier;
                }
                
                _logger.LogInformation($"Sending token request to Keycloak with {formData.Count} parameters");

                var content = new FormUrlEncodedContent(formData);
                var response = await httpClient.PostAsync(tokenEndpoint, content);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return Content(responseContent, "application/json");
                }

                _logger.LogError($"Token exchange failed: {responseContent}");
                return StatusCode((int)response.StatusCode, responseContent);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exchanging token");
                return StatusCode(500, new { error = "token_exchange_failed", message = ex.Message });
            }
        }
    }

    public class TokenRequest
    {
        public string GrantType { get; set; } = "authorization_code";
        public string ClientId { get; set; } = "";
        public string Code { get; set; } = "";
        public string RedirectUri { get; set; } = "";
        public string? RefreshToken { get; set; }
        public string? CodeVerifier { get; set; }
    }
}
