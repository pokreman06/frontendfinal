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
        modelBuilder.Entity<User>().ToTable("users"); // match SQL table name
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

