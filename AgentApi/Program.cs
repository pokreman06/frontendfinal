using Microsoft.EntityFrameworkCore;
using Npgsql; // Make sure you have Npgsql package installed
using Contexts;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using AgentApi.Services;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;
using AgentApi.Services.SearchValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
var builder = WebApplication.CreateBuilder(args);
// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
// Configure CORS so the frontend (dev and production) can call the API with credentials
builder.Services.AddCors(options =>
{
    options.AddPolicy("LocalDev", policy =>
    {
        policy.WithOrigins(
                "http://localhost:5173", 
                "http://127.0.0.1:5173",
                "https://client.nagent.duckdns.org",
                "http://client.nagent.duckdns.org"
              )
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // Allow credentials (cookies, auth headers)
    });
});

// Configure JWT authentication with Keycloak
var keycloakAuthority = Environment.GetEnvironmentVariable("KEYCLOAK_AUTHORITY") 
                        ?? "https://auth-dev.snowse.io/realms/DevRealm";
var keycloakAudience = Environment.GetEnvironmentVariable("KEYCLOAK_AUDIENCE") ?? "nagent-api";

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = keycloakAuthority;
        options.Audience = keycloakAudience;
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            ValidateIssuer = true,
            // Disable audience validation for local development
            ValidateAudience = !builder.Environment.IsDevelopment(),
            ValidateLifetime = true,
        };
    });

string connectionString = Environment.GetEnvironmentVariable("DATABASE_URL") 
                          ?? builder.Configuration.GetConnectionString("DefaultConnection")!;

builder.Services.AddHttpClient(); // Add HttpClientFactory for AuthController
builder.Services.AddSingleton(new PromptSearcher(Environment.GetEnvironmentVariable("GOOGLE_API"), Environment.GetEnvironmentVariable("CUSTOM_SEARCH_ENGINE")));
builder.Services.AddScoped<WebPageFetcher>();
builder.Services.AddDbContext<MyDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddHttpClient<ILocalAIService, LocalAIService>(client =>
{
    client.BaseAddress = new Uri("http://ai-snow.reindeer-pinecone.ts.net:9292/");
    client.Timeout = TimeSpan.FromMinutes(5); // Longer timeout for local models
});

// Register MCP Client with factory pattern
builder.Services.AddHttpClient<McpClient>(client =>
{
    var mcpServiceUrl = Environment.GetEnvironmentVariable("MCP_SERVICE_URL") ?? "http://facebook-mcp-service:8000";
    client.BaseAddress = new Uri(mcpServiceUrl);
    client.Timeout = TimeSpan.FromMinutes(2);
});
builder.Services.AddScoped<IMcpClient>(provider => provider.GetRequiredService<McpClient>());
var app = builder.Build();
// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Only enforce HTTPS redirection in production where HTTPS is correctly terminated
if (app.Environment.IsProduction())
{
    app.UseHttpsRedirection();
}

// Enable CORS using the policy defined above
app.UseCors("LocalDev");

// Enable authentication and authorization (DISABLED FOR TESTING)
// app.UseAuthentication();
// app.UseAuthorization();

app.MapControllers();

// Ensure database is created at startup (creates tables if missing).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MyDbContext>();
    db.Database.EnsureCreated();
}

app.MapGet("/", () => "hello world");
app.MapGet("/user", (MyDbContext context) => { return context.Users; });


app.Run();


