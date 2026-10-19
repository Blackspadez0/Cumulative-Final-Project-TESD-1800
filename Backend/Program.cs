using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Setup SQLite Database File
// 1. Setup TWO Separate SQLite Database Files
builder.Services.AddDbContext<ProductDbContext>(options =>
    options.UseSqlite("Data Source=products.db"));

builder.Services.AddDbContext<AccountDbContext>(options =>
    options.UseSqlite("Data Source=accounts.db")); // Creates accounts.db

// 2. Enable CORS so your local Vite UI can fetch data
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

app.UseCors();

// 3. Ensure BOTH Databases Exist on Startup
using (var scope = app.Services.CreateScope())
{
    var productDb = scope.ServiceProvider.GetRequiredService<ProductDbContext>();
    productDb.Database.EnsureCreated();

    var accountDb = scope.ServiceProvider.GetRequiredService<AccountDbContext>();
    accountDb.Database.EnsureCreated();
}

// --- ADDED/CHANGED THIS SECTION ---
// 4. Register the separate API modules
app.MapProductEndpoints();
app.MapAccountEndpoints();
// ----------------------------------

app.Run();

// ==========================================
// 5. Models & Databases
// ==========================================

// --- PRODUCTS DATA ---
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int InventoryCount { get; set; }
}

public class ProductDbContext : DbContext
{
    public ProductDbContext(DbContextOptions<ProductDbContext> options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();
}

// --- ACCOUNTS DATA ---
public class Account
{
    public int Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}


public class AccountDbContext : DbContext
{
    public AccountDbContext(DbContextOptions<AccountDbContext> options) : base(options) { }
    public DbSet<Account> Accounts => Set<Account>();
}