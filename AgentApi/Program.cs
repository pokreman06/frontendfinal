using Microsoft.EntityFrameworkCore;
using Npgsql; // Make sure you have Npgsql package installed
using Contexts;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using AgentApi.Services;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;
using AgentApi.Services.SearchValidation;
var builder = WebApplication.CreateBuilder(args);
// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

string connectionString = Environment.GetEnvironmentVariable("DATABASE_URL") 
                          ?? builder.Configuration.GetConnectionString("DefaultConnection")!;

builder.Services.AddSingleton(new PromptSearcher(Environment.GetEnvironmentVariable("GOOGLE_API"), Environment.GetEnvironmentVariable("CUSTOM_SEARCH_ENGINE")));
builder.Services.AddDbContext<MyDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddHttpClient<ILocalAIService, LocalAIService>(client =>
{
    client.BaseAddress = new Uri("https://ai-snow.reindeer-pinecone.ts.net/");
    client.Timeout = TimeSpan.FromMinutes(5); // Longer timeout for local models
});
builder.Services.AddSingleton<IMcpClient, McpClient>();
var app = builder.Build();
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
app.MapControllers();
app.UseHttpsRedirection();

var summaries = new[]
{
    "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
};

app.MapGet("/", () => "hello world");
app.MapGet("/user", (MyDbContext context) => { return context.Users; });


app.Run();


