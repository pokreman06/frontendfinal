using Microsoft.AspNetCore.Mvc;
using Contexts;

namespace AgentApi.Controllers;

[ApiController]
[Route("api/query-themes")]
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

        foreach (var t in dto.Themes)
        {
            _context.QueryThemes.Add(new QueryTheme { Text = t });
        }

        await _context.SaveChangesAsync();
        return NoContent();
    }
}
