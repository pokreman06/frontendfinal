using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Contexts;

namespace AgentApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SourceMaterialsController : ControllerBase
    {
        private readonly MyDbContext _context;
        private readonly ILogger<SourceMaterialsController> _logger;

        public SourceMaterialsController(MyDbContext context, ILogger<SourceMaterialsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        private string GetUserEmail()
        {
            // Log all claims for debugging
            var claims = User.Claims.Select(c => $"{c.Type}={c.Value}").ToList();
            _logger.LogInformation("Available claims: {Claims}", string.Join(", ", claims));
            
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
            
            if (string.IsNullOrEmpty(email))
            {
                _logger.LogError("No email claim found. User.Identity.IsAuthenticated: {IsAuthenticated}, User.Identity.Name: {Name}", 
                    User.Identity?.IsAuthenticated, User.Identity?.Name);
                throw new InvalidOperationException("User email not found in claims");
            }
            
            _logger.LogInformation("Extracted user email: {Email}", email);
            return email;
        }

        [HttpGet("user/{email}")]
        public async Task<ActionResult<List<SourceMaterial>>> GetMaterialsByEmail(string email)
        {
            try
            {
                _logger.LogInformation("GetMaterialsByEmail called with email: {Email}", email);
                var userEmail = GetUserEmail();
                
                // Users can only retrieve their own materials
                if (!userEmail.Equals(email, StringComparison.OrdinalIgnoreCase))
                {
                    _logger.LogWarning("User {AuthenticatedEmail} tried to access materials for {RequestedEmail}", userEmail, email);
                    return Forbid();
                }

                var materials = await _context.SourceMaterials
                    .Where(m => m.Email == userEmail)
                    .OrderByDescending(m => m.CreatedAt)
                    .ToListAsync();

                _logger.LogInformation("Retrieved {Count} source materials for {Email}", materials.Count, userEmail);
                return Ok(materials);
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogError(ex, "InvalidOperationException in GetMaterialsByEmail: {Message}", ex.Message);
                return Unauthorized(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving source materials for {Email}", email);
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<ActionResult<SourceMaterial>> CreateMaterial([FromBody] CreateSourceMaterialRequest request)
        {
            try
            {
                var userEmail = GetUserEmail();
                
                if (string.IsNullOrWhiteSpace(request.Url) || 
                    string.IsNullOrWhiteSpace(request.Title))
                {
                    return BadRequest("URL and Title are required");
                }

                var material = new SourceMaterial
                {
                    Email = userEmail,
                    Url = request.Url,
                    Title = request.Title,
                    ContentType = request.ContentType ?? "html",
                    Description = request.Description ?? string.Empty,
                    CreatedAt = DateTime.UtcNow
                };

                _context.SourceMaterials.Add(material);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Source material created: {Title} for {Email}", material.Title, userEmail);

                return CreatedAtAction(nameof(GetMaterialsByEmail), new { email = userEmail }, material);
            }
            catch (InvalidOperationException ex)
            {
                return Unauthorized(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating source material");
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<SourceMaterial>> UpdateMaterial(int id, [FromBody] UpdateSourceMaterialRequest request)
        {
            try
            {
                var userEmail = GetUserEmail();
                var material = await _context.SourceMaterials.FindAsync(id);
                
                if (material == null)
                {
                    return NotFound("Source material not found");
                }

                // Verify the material belongs to the current user
                if (material.Email != userEmail)
                {
                    return Forbid();
                }

                if (!string.IsNullOrWhiteSpace(request.Title))
                    material.Title = request.Title;
                if (!string.IsNullOrWhiteSpace(request.Url))
                    material.Url = request.Url;
                if (!string.IsNullOrWhiteSpace(request.ContentType))
                    material.ContentType = request.ContentType;
                if (!string.IsNullOrWhiteSpace(request.Description))
                    material.Description = request.Description;

                await _context.SaveChangesAsync();

                _logger.LogInformation("Source material updated: {Id} by user {Email}", id, userEmail);

                return Ok(material);
            }
            catch (InvalidOperationException ex)
            {
                return Unauthorized(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating source material");
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult> DeleteMaterial(int id)
        {
            try
            {
                var userEmail = GetUserEmail();
                var material = await _context.SourceMaterials.FindAsync(id);
                
                if (material == null)
                {
                    return NotFound("Source material not found");
                }

                // Verify the material belongs to the current user
                if (material.Email != userEmail)
                {
                    return Forbid();
                }

                _context.SourceMaterials.Remove(material);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Source material deleted: {Id} by user {Email}", id, userEmail);

                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return Unauthorized(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting source material");
                return StatusCode(500, $"Error: {ex.Message}");
            }
        }
    }

    public class CreateSourceMaterialRequest
    {
        public string Url { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string? ContentType { get; set; }
        public string? Description { get; set; }
    }

    public class UpdateSourceMaterialRequest
    {
        public string? Title { get; set; }
        public string? Url { get; set; }
        public string? ContentType { get; set; }
        public string? Description { get; set; }
    }
}
