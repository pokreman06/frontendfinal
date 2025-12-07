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
        public async Task<IActionResult> ExchangeToken()
        {
            try
            {
                // Read form data manually since [FromForm] doesn't work reliably with OIDC clients
                var form = await Request.ReadFormAsync();

                var grantType = form["grant_type"].ToString();
                var clientId = form["client_id"].ToString();
                var code = form["code"].ToString();
                var redirectUri = form["redirect_uri"].ToString();
                var refreshToken = form["refresh_token"].ToString();
                var codeVerifier = form["code_verifier"].ToString();

                _logger.LogInformation($"Token exchange request - ClientId: {clientId}, GrantType: {grantType}, HasCode: {!string.IsNullOrEmpty(code)}, HasCodeVerifier: {!string.IsNullOrEmpty(codeVerifier)}");

                var httpClient = _httpClientFactory.CreateClient();
                var tokenEndpoint = $"{_keycloakAuthority}/protocol/openid-connect/token";

                var formData = new Dictionary<string, string>
                {
                    { "grant_type", grantType },
                    { "client_id", clientId },
                    { "redirect_uri", redirectUri }
                };

                if (!string.IsNullOrEmpty(code))
                {
                    formData["code"] = code;
                }

                if (!string.IsNullOrEmpty(refreshToken))
                {
                    formData["refresh_token"] = refreshToken;
                }

                if (!string.IsNullOrEmpty(codeVerifier))
                {
                    formData["code_verifier"] = codeVerifier;
                }

                _logger.LogInformation($"Sending token request to Keycloak with {formData.Count} parameters");

                var content = new FormUrlEncodedContent(formData);

                _logger.LogInformation($"Calling Keycloak token endpoint: {tokenEndpoint}");
                var response = await httpClient.PostAsync(tokenEndpoint, content);
                var responseContent = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Token exchange successful");
                    return Content(responseContent, "application/json");
                }

                _logger.LogError($"Token exchange failed with status {response.StatusCode}: {responseContent}");
                _logger.LogError($"Request details - ClientId: {formData.GetValueOrDefault("client_id")}, RedirectUri: {formData.GetValueOrDefault("redirect_uri")}");
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
