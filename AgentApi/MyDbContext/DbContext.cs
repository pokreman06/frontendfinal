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
    }
    // Define your tables
    public DbSet<User> Users { get; set; }
}

public class User
{
    public int Id { get; set; }          // matches SERIAL PRIMARY KEY
    public string Username { get; set; } = string.Empty;  // matches TEXT NOT NULL
    public string Email { get; set; } = string.Empty;     // matches TEXT NOT NULL UNIQUE
}

