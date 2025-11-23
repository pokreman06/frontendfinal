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
    }
    public DbSet<User> Users { get; set; }
    public DbSet<QueryTheme> QueryThemes { get; set; }
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
}