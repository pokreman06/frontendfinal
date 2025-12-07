using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Contexts;

namespace AgentApi.Controllers;

[ApiController]
[Route("api/query-themes")]
// TODO: Re-enable [Authorize] for production deployment
// [Authorize] // Currently disabled for local development
public class QueryThemesController : ControllerBase
{
    private readonly MyDbContext _context;

    public QueryThemesController(MyDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public IActionResult Get()
    {
        var themes = _context.QueryThemes.Select(q => q.Text).ToList();
        return Ok(new { themes });
    }

    public class ThemesDto
    {
        public List<string> Themes { get; set; } = new List<string>();
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] ThemesDto dto)
    {
        // Replace existing themes with the provided list
        var existing = _context.QueryThemes.ToList();
        if (existing.Any())
        {
            _context.QueryThemes.RemoveRange(existing);
        }

        // Load selection state from localStorage-persisted data
        // For now, check if theme was in the selected list (from frontend localStorage)
        // Frontend will handle selection state via localStorage
        foreach (var t in dto.Themes)
        {
            _context.QueryThemes.Add(new QueryTheme { Text = t, Selected = true });
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("selection")]
    public async Task<IActionResult> UpdateSelection([FromBody] SelectionDto dto)
    {
        // Update selection state for specific themes
        var themes = _context.QueryThemes.ToList();
        foreach (var theme in themes)
        {
            theme.Selected = dto.SelectedTexts.Contains(theme.Text);
        }
        await _context.SaveChangesAsync();
        return NoContent();
    }

    public class SelectionDto
    {
        public List<string> SelectedTexts { get; set; } = new List<string>();
    }
}
