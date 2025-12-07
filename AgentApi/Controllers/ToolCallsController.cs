using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Contexts;
using System.Text.Json;

namespace AgentApi.Controllers;

[ApiController]
[Route("api/tool-calls")]
public class ToolCallsController : ControllerBase
{
    private readonly MyDbContext _context;
    private readonly ILogger<ToolCallsController> _logger;

    public ToolCallsController(MyDbContext context, ILogger<ToolCallsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] int page = 1, [FromQuery] int pageSize = 50, [FromQuery] string? toolName = null)
    {
        try
        {
            var query = _context.ToolCalls.AsQueryable();

            // Filter by tool name if provided
            if (!string.IsNullOrEmpty(toolName))
            {
                query = query.Where(t => t.ToolName.Contains(toolName));
            }

            var total = await query.CountAsync();

            var toolCalls = await query
                .OrderByDescending(t => t.ExecutedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                total,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling(total / (double)pageSize),
                toolCalls = toolCalls.Select(tc => new
                {
                    tc.Id,
                    tc.ToolName,
                    tc.Query,
                    Arguments = TryParseJson(tc.Arguments),
                    Result = TryParseJson(tc.Result),
                    tc.ExecutedAt,
                    tc.DurationMs
                })
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tool calls");
            return StatusCode(500, new { error = "Failed to retrieve tool calls" });
        }
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateToolCallDto dto)
    {
        try
        {
            var toolCall = new AgentToolCall
            {
                ToolName = dto.ToolName,
                Query = dto.Query,
                Arguments = dto.Arguments,
                Result = dto.Result,
                ExecutedAt = dto.ExecutedAt ?? DateTime.UtcNow,
                DurationMs = dto.DurationMs
            };

            _context.ToolCalls.Add(toolCall);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Tool call logged: {ToolName} with query: {Query}", dto.ToolName, dto.Query);

            return CreatedAtAction(nameof(Get), new { id = toolCall.Id }, toolCall);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating tool call");
            return StatusCode(500, new { error = "Failed to create tool call" });
        }
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        try
        {
            var stats = await _context.ToolCalls
                .GroupBy(t => t.ToolName)
                .Select(g => new
                {
                    ToolName = g.Key,
                    Count = g.Count(),
                    AvgDurationMs = g.Average(t => t.DurationMs),
                    LastExecuted = g.Max(t => t.ExecutedAt)
                })
                .OrderByDescending(s => s.Count)
                .ToListAsync();

            return Ok(new { stats });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving tool call stats");
            return StatusCode(500, new { error = "Failed to retrieve stats" });
        }
    }

    public class CreateToolCallDto
    {
        public string ToolName { get; set; } = string.Empty;
        public string Query { get; set; } = string.Empty;
        public string Arguments { get; set; } = string.Empty; // JSON string
        public string Result { get; set; } = string.Empty; // JSON string
        public DateTime? ExecutedAt { get; set; }
        public long? DurationMs { get; set; }
    }

    private static object? TryParseJson(string jsonString)
    {
        if (string.IsNullOrEmpty(jsonString))
            return null;

        try
        {
            return JsonSerializer.Deserialize<object>(jsonString);
        }
        catch
        {
            return jsonString;
        }
    }
}
