using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using AgentApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;

namespace AgentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ImagesController : ControllerBase
    {
        private readonly IHttpClientFactory _httpFactory;
        private readonly ILogger<ImagesController> _logger;

        // Default key provided here for convenience; recommend setting PIXABAY_API_KEY in env instead.
        private const string DefaultPixabayKey = "53370365-c00eb9836164b05a464c41762";

        public ImagesController(IHttpClientFactory httpFactory, ILogger<ImagesController> logger)
        {
            _httpFactory = httpFactory;
            _logger = logger;
        }

        [HttpGet("search")]
        public async Task<IActionResult> Search([FromQuery] ImageSearchParams query)
        {
            try
            {
                var apiKey = Environment.GetEnvironmentVariable("PIXABAY_API_KEY") ?? DefaultPixabayKey;

                var baseUrl = "https://pixabay.com/api/";
                var parameters = new Dictionary<string, string?>
                {
                    ["key"] = apiKey,
                    ["q"] = query.q,
                    ["lang"] = query.lang,
                    ["id"] = query.id,
                    ["image_type"] = query.image_type,
                    ["orientation"] = query.orientation,
                    ["category"] = query.category,
                    ["min_width"] = query.min_width?.ToString(),
                    ["min_height"] = query.min_height?.ToString(),
                    ["colors"] = query.colors,
                    ["editors_choice"] = query.editors_choice?.ToString().ToLower(),
                    ["safesearch"] = query.safesearch?.ToString().ToLower(),
                    ["order"] = query.order,
                    ["page"] = query.page?.ToString(),
                    ["per_page"] = query.per_page?.ToString(),
                    ["pretty"] = query.pretty?.ToString().ToLower()
                };

                // Remove null/empty entries
                var filtered = parameters
                    .Where(kv => !string.IsNullOrEmpty(kv.Value))
                    .ToDictionary(kv => kv.Key, kv => kv.Value!);

                var url = QueryHelpers.AddQueryString(baseUrl, filtered!);

                var client = _httpFactory.CreateClient();
                var resp = await client.GetAsync(url);
                var content = await resp.Content.ReadAsStringAsync();

                return Content(content, "application/json");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching images from Pixabay");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("function")]
        public ActionResult<FunctionTool> Function()
        {
            var func = new FunctionTool
            {
                Type = "function",
                Function = new FunctionDefinition
                {
                    Name = "pixabay_search",
                    Description = "Search images using Pixabay API. Returns a list of image hits.",
                    Parameters = new ParametersSchema
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["q"] = new PropertyDefinition { Type = "string", Description = "URL-encoded search term (max 100 chars)" },
                            ["lang"] = new PropertyDefinition { Type = "string", Description = "Language code (e.g. en, es)" },
                            ["image_type"] = new PropertyDefinition { Type = "string", Description = "Filter by image type: all, photo, illustration, vector", Enum = new List<string>{"all","photo","illustration","vector"} },
                            ["orientation"] = new PropertyDefinition { Type = "string", Description = "Orientation: all, horizontal, vertical", Enum = new List<string>{"all","horizontal","vertical"} },
                            ["category"] = new PropertyDefinition { Type = "string", Description = "Category filter, e.g. nature, people" },
                            ["min_width"] = new PropertyDefinition { Type = "integer", Description = "Minimum image width" },
                            ["min_height"] = new PropertyDefinition { Type = "integer", Description = "Minimum image height" },
                            ["colors"] = new PropertyDefinition { Type = "string", Description = "Comma-separated colors: red,blue,green,..." },
                            ["editors_choice"] = new PropertyDefinition { Type = "boolean", Description = "Only editor's choice images" },
                            ["safesearch"] = new PropertyDefinition { Type = "boolean", Description = "Only safe-for-work images" },
                            ["order"] = new PropertyDefinition { Type = "string", Description = "Order results by popular or latest", Enum = new List<string>{"popular","latest"} },
                            ["page"] = new PropertyDefinition { Type = "integer", Description = "Page number" },
                            ["per_page"] = new PropertyDefinition { Type = "integer", Description = "Results per page (3-200)" }
                        },
                        Required = new List<string>()
                    }
                }
            };

            return Ok(func);
        }
    }

    public class ImageSearchParams
    {
        public string? q { get; set; }
        public string? lang { get; set; }
        public string? id { get; set; }
        public string? image_type { get; set; }
        public string? orientation { get; set; }
        public string? category { get; set; }
        public int? min_width { get; set; }
        public int? min_height { get; set; }
        public string? colors { get; set; }
        public bool? editors_choice { get; set; }
        public bool? safesearch { get; set; }
        public string? order { get; set; }
        public int? page { get; set; }
        public int? per_page { get; set; }
        public bool? pretty { get; set; }
    }
}
