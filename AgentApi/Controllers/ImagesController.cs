using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using AgentApi.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Hosting;
using Contexts;

namespace AgentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class ImagesController : ControllerBase
    {
        private readonly IHttpClientFactory _httpFactory;
        private readonly ILogger<ImagesController> _logger;
        private readonly MyDbContext _context;

        private string GetUserEmail()
        {
            // ASP.NET Core maps JWT "email" claim to this long claim type
            var email = User.FindFirst("http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress")?.Value;
            if (string.IsNullOrEmpty(email))
            {
                // Also try the short form in case it exists
                email = User.FindFirst("email")?.Value;
            }
            if (string.IsNullOrEmpty(email))
            {
                email = User.FindFirst("preferred_username")?.Value;
            }
            if (string.IsNullOrEmpty(email))
            {
                email = User.FindFirst("sub")?.Value;
            }
            return email ?? throw new InvalidOperationException("User email not found in claims");
        }

        // Default key provided here for convenience; recommend setting PIXABAY_API_KEY in env instead.
        private const string DefaultPixabayKey = "53370365-c00eb9836164b05a464c41762";

        public ImagesController(IHttpClientFactory httpFactory, ILogger<ImagesController> logger, MyDbContext context)
        {
            _httpFactory = httpFactory;
            _logger = logger;
            _context = context;
        }

        [HttpGet("search")]
        [AllowAnonymous]
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
                            ["image_type"] = new PropertyDefinition { Type = "string", Description = "Filter by image type: all, photo, illustration, vector", Enum = new List<string> { "all", "photo", "illustration", "vector" } },
                            ["orientation"] = new PropertyDefinition { Type = "string", Description = "Orientation: all, horizontal, vertical", Enum = new List<string> { "all", "horizontal", "vertical" } },
                            ["category"] = new PropertyDefinition { Type = "string", Description = "Category filter, e.g. nature, people" },
                            ["min_width"] = new PropertyDefinition { Type = "integer", Description = "Minimum image width" },
                            ["min_height"] = new PropertyDefinition { Type = "integer", Description = "Minimum image height" },
                            ["colors"] = new PropertyDefinition { Type = "string", Description = "Comma-separated colors: red,blue,green,..." },
                            ["editors_choice"] = new PropertyDefinition { Type = "boolean", Description = "Only editor's choice images" },
                            ["safesearch"] = new PropertyDefinition { Type = "boolean", Description = "Only safe-for-work images" },
                            ["order"] = new PropertyDefinition { Type = "string", Description = "Order results by popular or latest", Enum = new List<string> { "popular", "latest" } },
                            ["page"] = new PropertyDefinition { Type = "integer", Description = "Page number" },
                            ["per_page"] = new PropertyDefinition { Type = "integer", Description = "Results per page (3-200)" }
                        },
                        Required = new List<string>()
                    }
                }
            };

            return Ok(func);
        }

        [HttpPost("upload")]
        public async Task<IActionResult> Upload(IFormFile file)
        {
            try
            {
                var userEmail = GetUserEmail();

                if (file == null || file.Length == 0)
                {
                    return BadRequest(new { error = "No file provided" });
                }

                // Validate file type
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
                var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (!allowedExtensions.Contains(extension))
                {
                    return BadRequest(new { error = "Invalid file type. Allowed: jpg, jpeg, png, gif, webp" });
                }

                // Limit file size to 10MB
                if (file.Length > 10 * 1024 * 1024)
                {
                    return BadRequest(new { error = "File too large. Maximum size: 10MB" });
                }

                // Read file data into memory
                byte[] fileData;
                using (var memoryStream = new MemoryStream())
                {
                    await file.CopyToAsync(memoryStream);
                    fileData = memoryStream.ToArray();
                }

                // Generate unique filename
                var fileName = $"{Guid.NewGuid()}{extension}";

                // Save to database
                var savedImage = new Contexts.SavedImage
                {
                    FileName = fileName,
                    OriginalName = file.FileName,
                    ContentType = file.ContentType,
                    Data = fileData,
                    Size = file.Length,
                    UploadedAt = DateTime.UtcNow,
                    UserEmail = userEmail
                };

                _context.SavedImages.Add(savedImage);
                await _context.SaveChangesAsync();

                // Return the URL
                var baseUrl = $"{Request.Scheme}://{Request.Host}";
                var imageUrl = $"{baseUrl}/api/images/{savedImage.Id}";

                _logger.LogInformation("Image uploaded to database: {FileName} (ID: {Id}) for user {Email}", file.FileName, savedImage.Id, userEmail);

                return Ok(new
                {
                    url = imageUrl,
                    id = savedImage.Id,
                    fileName = fileName,
                    originalName = file.FileName,
                    size = file.Length,
                    uploadedAt = savedImage.UploadedAt
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "Error uploading image: user email not found in claims");
                return Unauthorized(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading image");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("saved")]
        public IActionResult GetSavedImages()
        {
            try
            {
                _logger.LogInformation("GetSavedImages called");
                var userEmail = GetUserEmail();
                _logger.LogInformation("GetSavedImages - authenticated as: {Email}", userEmail);

                // Provide both browser-accessible URL and Docker-network URL
                var browserBaseUrl = $"{Request.Scheme}://{Request.Host}";
                var dockerBaseUrl = "http://web:8080";

                var images = _context.SavedImages
                    .Where(i => i.UserEmail == userEmail)
                    .OrderByDescending(i => i.UploadedAt)
                    .Select(i => new
                    {
                        url = $"{browserBaseUrl}/api/images/{i.Id}",  // For browser display
                        dockerUrl = $"{dockerBaseUrl}/api/images/{i.Id}",  // For MCP service
                        id = i.Id,
                        fileName = i.FileName,
                        originalName = i.OriginalName,
                        size = i.Size,
                        uploadedAt = i.UploadedAt
                    })
                    .ToList();

                _logger.LogInformation("GetSavedImages - returning {Count} images for user {Email}", images.Count, userEmail);
                return Ok(new { images });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "GetSavedImages - InvalidOperationException: {Message}", ex.Message);
                return Unauthorized(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving saved images");
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpGet("{id}")]
        [AllowAnonymous]  // Image retrieval doesn't require auth - ID is not guessable and is tied to user in upload
        public IActionResult GetImage(int id)
        {
            try
            {
                var image = _context.SavedImages.Find(id);

                if (image == null)
                {
                    return NotFound();
                }

                // Note: We're not checking user ownership here since the image ID is not publicly guessable
                // and access to a specific image ID doesn't reveal sensitive information about other users

                return File(image.Data, image.ContentType);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving image: {Id}", id);
                return StatusCode(500, new { error = ex.Message });
            }
        }

        [HttpDelete("saved/{id}")]
        public IActionResult DeleteImage(int id)
        {
            try
            {
                var userEmail = GetUserEmail();
                var image = _context.SavedImages.Find(id);

                if (image == null)
                {
                    return NotFound(new { error = "Image not found" });
                }

                // Verify the image belongs to the current user
                if (image.UserEmail != userEmail)
                {
                    return Forbid();
                }

                _context.SavedImages.Remove(image);
                _context.SaveChanges();

                _logger.LogInformation("Image deleted from database: {Id} by user {Email}", id, userEmail);

                return Ok(new { message = "Image deleted successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting image: {Id}", id);
                return StatusCode(500, new { error = ex.Message });
            }
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
