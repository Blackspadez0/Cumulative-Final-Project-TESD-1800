using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// 1. Setup SQLite Database File
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=products.db"));

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

// 3. Ensure Database Exists
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated();
}

// 4. Create the requested Product Endpoint
app.MapGet("/productAPI", async (AppDbContext db) =>
    await db.Products.ToListAsync());
app.MapPost("/productAPI", async (Product product, AppDbContext db) =>
{
    product.Id = 0; // let SQLite assign the id
    db.Products.Add(product);
    await db.SaveChangesAsync();
    return Results.Created($"/productAPI/{product.Id}", product);
});
app.Run();

// 5. Models
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public int InventoryCount { get; set; }
}

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();
}