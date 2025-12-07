using AgentApi.Models;
using AgentApi.Services;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using AgentApi.Services.SearchValidation;

namespace AgentApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SearchController(PromptSearcher searcher)
{
    [HttpGet("search")]
    public async Task<List<string>> Search(string query)
    {
        return await searcher.GetQuery(query);
    }
    [HttpGet("health")]
    public string Health()
    {
        return "SearchController is healthy token:" + searcher.hasToken();
    }
}