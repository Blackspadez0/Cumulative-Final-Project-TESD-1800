using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

public static class ProductEndpoints
{
    public static void MapProductEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/productAPI");

        // Public catalog; seller identity is never exposed as an editable field.
        group.MapGet("/", async (ProductDbContext db) =>
            await db.Products.AsNoTracking().ToListAsync());

        group.MapPost("/", async (
            Product product,
            ProductDbContext db,
            ClaimsPrincipal user) =>
        {
            var sellerId = GetAccountId(user);
            if (sellerId is null) return Results.Unauthorized();

            product.Id = 0;
            product.SellerAccountId = sellerId.Value;
            db.Products.Add(product);
            await db.SaveChangesAsync();
            return Results.Created($"/productAPI/{product.Id}", product);
        }).RequireAuthorization();

        // Fulfills Product Editing: only the authenticated product owner may update.
        group.MapPut("/{id:int}", async (
            int id, ProductUpdateRequest request, ProductDbContext db, ClaimsPrincipal user) =>
        {
            var sellerId = GetAccountId(user);
            if (sellerId is null) return Results.Unauthorized();

            var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id);
            if (product is null || product.SellerAccountId != sellerId)
                return Results.NotFound(new { message = "Product not found." });

            product.Name = request.Name.Trim();
            product.Price = request.Price;
            product.InventoryCount = request.InventoryCount;
            await db.SaveChangesAsync();
            return Results.Ok(new { message = "Product updated successfully.", id = product.Id, product });
        }).RequireAuthorization();

        // Fulfills Product Deletion: purchases and product are removed atomically.
        group.MapDelete("/{id:int}", async (int id, ProductDbContext db, ClaimsPrincipal user) =>
        {
            var sellerId = GetAccountId(user);
            if (sellerId is null) return Results.Unauthorized();

            var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id);
            if (product is null || product.SellerAccountId != sellerId)
                return Results.NotFound(new { message = "Product not found." });

            await using var transaction = await db.Database.BeginTransactionAsync();
            await db.Purchases.Where(p => p.ProductId == id).ExecuteDeleteAsync();
            db.Products.Remove(product);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return Results.Ok(new { message = "Product deleted successfully.", id });
        }).RequireAuthorization();
    }

    internal static int? GetAccountId(ClaimsPrincipal user)
    {
        var value = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return int.TryParse(value, out var id) ? id : null;
    }
}

public record ProductUpdateRequest(string Name, decimal Price, int InventoryCount);
