
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;

public record PurchaseRequest(int ProductId, int Quantity);

public static class PurchaseEndpoints
{
    public static void MapPurchaseEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/purchaseAPI");

        group.MapPost("/", async (
            PurchaseRequest request,
            HttpContext httpContext,
            ProductDbContext db) =>
        {
            if (request.Quantity <= 0)
            {
                return Results.BadRequest(
                    new { message = "Quantity must be greater than zero." });
            }

            // The buyer's identity comes from the authenticated session,
            // not from a buyer ID supplied in the request body.
            var buyerIdValue = httpContext.User
                .FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!int.TryParse(buyerIdValue, out var buyerAccountId))
            {
                return Results.Unauthorized();
            }

            // Keep the inventory update and purchase creation together.
            await using var transaction =
                await db.Database.BeginTransactionAsync();

            // Atomically reduce inventory only if enough units remain.
            // This prevents concurrent requests from overselling inventory.
            var updatedRows = await db.Products
                .Where(p =>
                    p.Id == request.ProductId &&
                    p.InventoryCount >= request.Quantity)
                .ExecuteUpdateAsync(setters =>
                    setters.SetProperty(
                        p => p.InventoryCount,
                        p => p.InventoryCount - request.Quantity));

            if (updatedRows == 0)
            {
                var productExists = await db.Products
                    .AnyAsync(p => p.Id == request.ProductId);

                if (!productExists)
                {
                    return Results.NotFound(
                        new { message = "Product not found." });
                }

                return Results.Conflict(
                    new { message = "Insufficient inventory." });
            }

            // Read the product price for the purchase record.
            var product = await db.Products
                .FirstOrDefaultAsync(p => p.Id == request.ProductId);

            if (product is null)
            {
                return Results.NotFound(
                    new { message = "Product not found." });
            }

            var purchase = new Purchase
            {
                ProductId = product.Id,
                BuyerAccountId = buyerAccountId,
                Quantity = request.Quantity,
                PriceAtPurchase = product.Price,
                PurchasedAt = DateTime.UtcNow
            };

            db.Purchases.Add(purchase);

            await db.SaveChangesAsync();
            await transaction.CommitAsync();

            return Results.Created(
                $"/purchaseAPI/{purchase.Id}",
                new { purchase.Id });
        })
        .RequireAuthorization();
    }
}
