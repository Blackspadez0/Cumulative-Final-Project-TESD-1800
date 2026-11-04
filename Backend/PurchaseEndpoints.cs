using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

public record PurchaseRequest(int ProductId, int Quantity);

public static class PurchaseEndpoints
{
    public static void MapPurchaseEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/purchaseAPI");

        group.MapPost("/", async (PurchaseRequest request, HttpContext httpContext, ProductDbContext db) =>
        {
            if (request.Quantity <= 0)
                return Results.BadRequest(new { message = "Quantity must be greater than zero." });

            var buyerId = ProductEndpoints.GetAccountId(httpContext.User);
            if (buyerId is null) return Results.Unauthorized();

            await using var transaction = await db.Database.BeginTransactionAsync();
            var updatedRows = await db.Products
                .Where(p => p.Id == request.ProductId && p.InventoryCount >= request.Quantity)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.InventoryCount, p => p.InventoryCount - request.Quantity));

            if (updatedRows == 0)
            {
                var exists = await db.Products.AnyAsync(p => p.Id == request.ProductId);
                if (!exists)
                    return Results.NotFound(new { message = "Product not found." });
                return Results.Conflict(new { message = "Insufficient inventory." });
            }

            var product = await db.Products.FirstAsync(p => p.Id == request.ProductId);
            var purchase = new Purchase
            {
                ProductId = product.Id,
                BuyerAccountId = buyerId.Value,
                Quantity = request.Quantity,
                PriceAtPurchase = product.Price,
                PurchasedAt = DateTime.UtcNow
            };
            db.Purchases.Add(purchase);
            await db.SaveChangesAsync();
            await transaction.CommitAsync();
            return Results.Created($"/purchaseAPI/{purchase.Id}", new { purchase.Id });
        }).RequireAuthorization();

        // Buyers can retrieve only records whose BuyerAccountId matches their session.
        group.MapGet("/mine", async (ClaimsPrincipal user, ProductDbContext db) =>
        {
            var buyerId = ProductEndpoints.GetAccountId(user);
            if (buyerId is null) return Results.Unauthorized();
            var purchases = await db.Purchases.AsNoTracking()
                .Where(p => p.BuyerAccountId == buyerId.Value)
                .OrderByDescending(p => p.PurchasedAt)
                .Select(p => new { p.Id, p.ProductId, productName = db.Products.Where(x => x.Id == p.ProductId).Select(x => x.Name).FirstOrDefault(), p.Quantity, p.PriceAtPurchase, p.PurchasedAt })
                .ToListAsync();
            return Results.Ok(purchases);
        }).RequireAuthorization();

        // Sellers can retrieve only purchases for products they own.
        group.MapGet("/seller", async (ClaimsPrincipal user, ProductDbContext db) =>
        {
            var sellerId = ProductEndpoints.GetAccountId(user);
            if (sellerId is null) return Results.Unauthorized();
            var purchases = await db.Purchases.AsNoTracking()
                .Join(db.Products.AsNoTracking().Where(p => p.SellerAccountId == sellerId.Value),
                    purchase => purchase.ProductId, product => product.Id,
                    (purchase, product) => new { purchase.Id, purchase.ProductId, productName = product.Name, purchase.BuyerAccountId, purchase.Quantity, purchase.PriceAtPurchase, purchase.PurchasedAt })
                .OrderByDescending(p => p.PurchasedAt)
                .ToListAsync();
            return Results.Ok(purchases);
        }).RequireAuthorization();
    }
}
