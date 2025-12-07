using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Contexts;

namespace AgentApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ToolSettingsController : ControllerBase
{
    private readonly MyDbContext _context;
    private readonly ILogger<ToolSettingsController> _logger;

    public ToolSettingsController(MyDbContext context, ILogger<ToolSettingsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ToolSettingsDto>>> GetAll()
    {
        try
        {
            var tools = await _context.ToolSettings.ToListAsync();
            return Ok(tools.Select(t => new ToolSettingsDto
            {
                Id = t.Id,
                ToolName = t.ToolName,
                IsEnabled = t.IsEnabled,
                Description = t.Description
            }).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tool settings");
            return StatusCode(500, new { error = "Failed to retrieve tool settings" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ToolSettingsDto>> GetById(int id)
    {
        try
        {
            var tool = await _context.ToolSettings.FindAsync(id);
            if (tool == null)
            {
                return NotFound();
            }

            return Ok(new ToolSettingsDto
            {
                Id = tool.Id,
                ToolName = tool.ToolName,
                IsEnabled = tool.IsEnabled,
                Description = tool.Description
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tool setting");
            return StatusCode(500, new { error = "Failed to retrieve tool setting" });
        }
    }

    [HttpPost]
    public async Task<ActionResult<ToolSettingsDto>> Create(CreateToolSettingsDto dto)
    {
        try
        {
            // Check if tool already exists
            var existing = await _context.ToolSettings
                .FirstOrDefaultAsync(t => t.ToolName == dto.ToolName);

            if (existing != null)
            {
                return BadRequest(new { error = "Tool setting already exists" });
            }

            var toolSetting = new ToolSettings
            {
                ToolName = dto.ToolName,
                IsEnabled = dto.IsEnabled,
                Description = dto.Description ?? string.Empty
            };

            _context.ToolSettings.Add(toolSetting);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created tool setting for {ToolName}", dto.ToolName);

            return CreatedAtAction(nameof(GetById), new { id = toolSetting.Id }, new ToolSettingsDto
            {
                Id = toolSetting.Id,
                ToolName = toolSetting.ToolName,
                IsEnabled = toolSetting.IsEnabled,
                Description = toolSetting.Description
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating tool setting");
            return StatusCode(500, new { error = "Failed to create tool setting" });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<ToolSettingsDto>> Update(int id, UpdateToolSettingsDto dto)
    {
        try
        {
            var tool = await _context.ToolSettings.FindAsync(id);
            if (tool == null)
            {
                return NotFound();
            }

            tool.IsEnabled = dto.IsEnabled;
            if (!string.IsNullOrEmpty(dto.Description))
            {
                tool.Description = dto.Description;
            }

            _context.ToolSettings.Update(tool);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated tool setting {ToolName}: IsEnabled={IsEnabled}", tool.ToolName, tool.IsEnabled);

            return Ok(new ToolSettingsDto
            {
                Id = tool.Id,
                ToolName = tool.ToolName,
                IsEnabled = tool.IsEnabled,
                Description = tool.Description
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating tool setting");
            return StatusCode(500, new { error = "Failed to update tool setting" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            var tool = await _context.ToolSettings.FindAsync(id);
            if (tool == null)
            {
                return NotFound();
            }

            _context.ToolSettings.Remove(tool);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted tool setting {ToolName}", tool.ToolName);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting tool setting");
            return StatusCode(500, new { error = "Failed to delete tool setting" });
        }
    }

    [HttpPut("bulk")]
    public async Task<IActionResult> BulkUpdate(BulkUpdateToolSettingsDto dto)
    {
        try
        {
            var tools = await _context.ToolSettings.ToListAsync();

            foreach (var tool in tools)
            {
                var update = dto.Tools.FirstOrDefault(t => t.ToolName == tool.ToolName);
                if (update != null)
                {
                    tool.IsEnabled = update.IsEnabled;
                }
            }

            _context.ToolSettings.UpdateRange(tools);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Bulk updated {Count} tool settings", tools.Count);

            return Ok(new { message = "Tool settings updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk updating tool settings");
            return StatusCode(500, new { error = "Failed to bulk update tool settings" });
        }
    }

    [HttpGet("enabled")]
    public async Task<ActionResult<IEnumerable<string>>> GetEnabledTools()
    {
        try
        {
            var enabledTools = await _context.ToolSettings
                .Where(t => t.IsEnabled)
                .Select(t => t.ToolName)
                .ToListAsync();

            return Ok(enabledTools);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving enabled tools");
            return StatusCode(500, new { error = "Failed to retrieve enabled tools" });
        }
    }
}

public class ToolSettingsDto
{
    public int Id { get; set; }
    public string ToolName { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public string Description { get; set; } = string.Empty;
}

public class CreateToolSettingsDto
{
    public string ToolName { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public string? Description { get; set; }
}

public class UpdateToolSettingsDto
{
    public bool IsEnabled { get; set; }
    public string? Description { get; set; }
}

public class BulkUpdateToolSettingsDto
{
    public List<ToolToggleDto> Tools { get; set; } = new();
}

public class ToolToggleDto
{
    public string ToolName { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
}
