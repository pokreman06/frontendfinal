using Microsoft.EntityFrameworkCore;

namespace Contexts;

public class MyDbContext : DbContext
{
    public MyDbContext(DbContextOptions<MyDbContext> options)
        : base(options)
    {
    }
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");           // lowercase table name
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Username).HasColumnName("username");
            entity.Property(e => e.Email).HasColumnName("email");
        });
        modelBuilder.Entity<Post>(entity =>
{
    entity.ToTable("posts");
    entity.Property(e => e.Id).HasColumnName("id");
    entity.Property(e => e.UserId).HasColumnName("user_id");

    entity.HasMany(p => p.ImagePreferences)
          .WithOne(ip => ip.Post)
          .HasForeignKey(ip => ip.PostId);
});

        // ImagePreferences table
        modelBuilder.Entity<ImagePreference>(entity =>
        {
            entity.ToTable("image_preferences");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.PostId).HasColumnName("post_id");
            entity.Property(e => e.Preference).HasColumnName("preference");
        });

        // Query themes table
        modelBuilder.Entity<QueryTheme>(entity =>
        {
            entity.ToTable("query_themes");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Text).HasColumnName("text");
        });

        // Saved images table
        modelBuilder.Entity<SavedImage>(entity =>
        {
            entity.ToTable("saved_images");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.FileName).HasColumnName("file_name");
            entity.Property(e => e.OriginalName).HasColumnName("original_name");
            entity.Property(e => e.ContentType).HasColumnName("content_type");
            entity.Property(e => e.Data).HasColumnName("data");
            entity.Property(e => e.Size).HasColumnName("size");
            entity.Property(e => e.UploadedAt).HasColumnName("uploaded_at");
        });

        // Tool calls table
        modelBuilder.Entity<AgentToolCall>(entity =>
        {
            entity.ToTable("tool_calls");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ToolName).HasColumnName("tool_name");
            entity.Property(e => e.Query).HasColumnName("query");
            entity.Property(e => e.Arguments).HasColumnName("arguments");
            entity.Property(e => e.Result).HasColumnName("result");
            entity.Property(e => e.ExecutedAt).HasColumnName("executed_at");
            entity.Property(e => e.DurationMs).HasColumnName("duration_ms");
        });

        // Tool settings table
        modelBuilder.Entity<ToolSettings>(entity =>
        {
            entity.ToTable("tool_settings");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.ToolName).HasColumnName("tool_name");
            entity.Property(e => e.IsEnabled).HasColumnName("is_enabled");
            entity.Property(e => e.Description).HasColumnName("description");
        });

        // Source materials table
        modelBuilder.Entity<SourceMaterial>(entity =>
        {
            entity.ToTable("source_materials");
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Url).HasColumnName("url");
            entity.Property(e => e.Title).HasColumnName("title");
            entity.Property(e => e.ContentType).HasColumnName("content_type");
            entity.Property(e => e.Description).HasColumnName("description");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
        });
    }
    public DbSet<User> Users { get; set; }
    public DbSet<QueryTheme> QueryThemes { get; set; }
    public DbSet<SavedImage> SavedImages { get; set; }
    public DbSet<AgentToolCall> ToolCalls { get; set; }
    public DbSet<ToolSettings> ToolSettings { get; set; }
    public DbSet<SourceMaterial> SourceMaterials { get; set; }
}

public class User
{
    public int Id { get; set; }          // matches SERIAL PRIMARY KEY
    public string Username { get; set; } = string.Empty;  // matches TEXT NOT NULL
    public string Email { get; set; } = string.Empty;     // matches TEXT NOT NULL UNIQUE
}

public class Post
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public ICollection<ImagePreference> ImagePreferences { get; set; } = new List<ImagePreference>();
}

public class ImagePreference
{
    public int Id { get; set; }
    public int PostId { get; set; }
    public Post Post { get; set; } = null!;

    public string Preference { get; set; } = string.Empty;
}

public class QueryTheme
{
    public int Id { get; set; }
    public string Text { get; set; } = string.Empty;
    public bool Selected { get; set; } = true;
    public string UserEmail { get; set; } = string.Empty;
}

public class SavedImage
{
    public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string OriginalName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public byte[] Data { get; set; } = Array.Empty<byte>();
    public long Size { get; set; }
    public DateTime UploadedAt { get; set; }
    public string UserEmail { get; set; } = string.Empty;
}

public class AgentToolCall
{
    public int Id { get; set; }
    public string ToolName { get; set; } = string.Empty;
    public string Query { get; set; } = string.Empty;
    public string Arguments { get; set; } = string.Empty; // JSON serialized
    public string Result { get; set; } = string.Empty; // JSON serialized
    public DateTime ExecutedAt { get; set; }
    public long? DurationMs { get; set; }
}

public class ToolSettings
{
    public int Id { get; set; }
    public string ToolName { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public string Description { get; set; } = string.Empty;
}

public class SourceMaterial
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty; // "pdf" or "html"
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}