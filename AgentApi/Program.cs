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
            // Disable audience validation - our Keycloak may not set it correctly
            ValidateAudience = false,
            ValidateLifetime = true,
        };
    });

string connectionString = Environment.GetEnvironmentVariable("DATABASE_URL")
                          ?? builder.Configuration.GetConnectionString("DefaultConnection")!;

builder.Services.AddHttpClient(); // Add HttpClientFactory for AuthController
builder.Services.AddSingleton(new PromptSearcher(Environment.GetEnvironmentVariable("GOOGLE_API"), Environment.GetEnvironmentVariable("CUSTOM_SEARCH_ENGINE")));
builder.Services.AddScoped<WebPageFetcher>();
builder.Services.AddScoped<IToolCallExtractor, ToolCallExtractor>();
builder.Services.AddScoped<IToolOrchestrator, ToolOrchestrator>();
builder.Services.AddDbContext<MyDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddHttpClient<ILocalAIService, LocalAIService>(client =>
{
    client.BaseAddress = new Uri("http://ai-snow.reindeer-pinecone.ts.net:9292/");
    client.Timeout = TimeSpan.FromMinutes(5); // Longer timeout for local models
});

// Register MCP Client with factory pattern
var mcpServiceUrl = Environment.GetEnvironmentVariable("MCP_SERVICE_URL") ?? "http://mcp-service:8000";
builder.Services.AddHttpClient<McpClient>(client =>
{
    client.BaseAddress = new Uri(mcpServiceUrl);
    client.Timeout = TimeSpan.FromMinutes(2);
    // Small runtime info so pod logs show what the resolved MCP URL is
    Console.WriteLine($"MCP service URL resolved to: {mcpServiceUrl}");
});
builder.Services.AddScoped<IMcpClient>(provider => provider.GetRequiredService<McpClient>());
var app = builder.Build();

// Log the resolved MCP service URL
var logger = app.Services.GetRequiredService<ILogger<Program>>();
logger.LogInformation("MCP service URL resolved to: {McpServiceUrl}", mcpServiceUrl);

// Enable CORS using the policy defined above - MUST be early in the pipeline
app.UseCors("LocalDev");

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

// Enable authentication and authorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// Wait for database to be ready and apply migrations with retry logic
int maxRetries = 10;
int retryCount = 0;
Exception? lastException = null;

while (retryCount < maxRetries)
{
    try
    {
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<MyDbContext>();

            // Test connection
            db.Database.OpenConnection();
            db.Database.CloseConnection();

            Console.WriteLine("Database connection successful!");

            // Get list of applied and pending migrations
            var appliedMigrations = db.Database.GetAppliedMigrations().ToList();
            var pendingMigrations = db.Database.GetPendingMigrations().ToList();

            // If migrations table doesn't exist, create it manually
            if (!appliedMigrations.Any() && pendingMigrations.Any())
            {
                Console.WriteLine("Initializing migrations table...");
                db.Database.ExecuteSql($"CREATE TABLE IF NOT EXISTS \"__EFMigrationsHistory\" (\"MigrationId\" character varying(150) NOT NULL, \"ProductVersion\" character varying(32) NOT NULL, CONSTRAINT \"PK___EFMigrationsHistory\" PRIMARY KEY (\"MigrationId\"))");
            }

            // Apply pending migrations
            if (pendingMigrations.Any())
            {
                Console.WriteLine($"Applying {pendingMigrations.Count} pending migrations...");
                foreach (var migration in pendingMigrations)
                {
                    Console.WriteLine($"  - {migration}");
                }
                db.Database.Migrate();
                Console.WriteLine("Migrations applied successfully.");
            }
            else
            {
                Console.WriteLine("No pending migrations.");
            }
        }
        break; // Success, exit the retry loop
    }
    catch (Exception ex)
    {
        retryCount++;
        lastException = ex;
        Console.WriteLine($"Database connection attempt {retryCount}/{maxRetries} failed: {ex.Message}");
        if (retryCount < maxRetries)
        {
            Console.WriteLine("Waiting 2 seconds before retry...");
            System.Threading.Thread.Sleep(2000);
        }
    }
}

if (retryCount >= maxRetries && lastException != null)
{
    Console.WriteLine($"Failed to connect to database after {maxRetries} attempts: {lastException.Message}");
}

app.MapGet("/", () => "hello world");
app.MapGet("/user", (MyDbContext context) => { return context.Users; });

app.Run();

// Make Program class public and partial for WebApplicationFactory in tests
public partial class Program { }

