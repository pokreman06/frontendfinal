using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Contexts;

namespace AgentApi.Controllers;

[ApiController]
[Route("api/query-themes")]
[Authorize]
public class QueryThemesController : ControllerBase
{
    private readonly MyDbContext _context;

    public QueryThemesController(MyDbContext context)
    {
        _context = context;
    }

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

    [HttpGet]
    public IActionResult Get()
    {
        try
        {
            var userEmail = GetUserEmail();
            var themes = _context.QueryThemes
                .Where(q => q.UserEmail == userEmail)
                .Select(q => q.Text)
                .ToList();
            return Ok(new { themes });
        }
        catch (InvalidOperationException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    public class ThemesDto
    {
        public List<string> Themes { get; set; } = new List<string>();
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] ThemesDto dto)
    {
        try
        {
            var userEmail = GetUserEmail();

            // Replace existing themes for this user with the provided list
            var existing = _context.QueryThemes.Where(q => q.UserEmail == userEmail).ToList();
            if (existing.Any())
            {
                _context.QueryThemes.RemoveRange(existing);
            }

            // Load selection state from localStorage-persisted data
            // For now, check if theme was in the selected list (from frontend localStorage)
            // Frontend will handle selection state via localStorage
            foreach (var t in dto.Themes)
            {
                _context.QueryThemes.Add(new QueryTheme { Text = t, Selected = true, UserEmail = userEmail });
            }

            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    [HttpPost("selection")]
    public async Task<IActionResult> UpdateSelection([FromBody] SelectionDto dto)
    {
        try
        {
            var userEmail = GetUserEmail();

            // Update selection state for specific themes for this user
            var themes = _context.QueryThemes.Where(q => q.UserEmail == userEmail).ToList();
            foreach (var theme in themes)
            {
                theme.Selected = dto.SelectedTexts.Contains(theme.Text);
            }
            await _context.SaveChangesAsync();
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
    }

    public class SelectionDto
    {
        public List<string> SelectedTexts { get; set; } = new List<string>();
    }
}
