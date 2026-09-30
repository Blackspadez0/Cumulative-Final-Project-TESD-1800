using Microsoft.EntityFrameworkCore;
using Bogus;

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

// 3. Ensure Database Exists & Seed Test Data
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.EnsureCreated(); // Creates 'products.db' on disk if missing

    if (!db.Products.Any())
    {
        var productFaker = new Faker<Product>()
            // .RuleFor(p => p.Id, f => f.UniqueIndex)
            .RuleFor(p => p.Name, f => f.Commerce.ProductName());

        var fakeProducts = productFaker.Generate(10);
        db.Products.AddRange(fakeProducts);
        db.SaveChanges(); // Persists them permanently to your file
    }
}

// 4. Create the requested Product Endpoint
app.MapGet("/productAPI", async (AppDbContext db) => 
    await db.Products.ToListAsync());

app.Run();

// 5. Models
public class Product
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
    public DbSet<Product> Products => Set<Product>();
}
