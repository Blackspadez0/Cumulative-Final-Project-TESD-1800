
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

            var buyerIdValue = httpContext.User
                .FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (!int.TryParse(buyerIdValue, out var buyerAccountId))
            {
                return Results.Unauthorized();
            }

            var product = await db.Products
                .FirstOrDefaultAsync(p => p.Id == request.ProductId);

            if (product is null)
            {
                return Results.NotFound(
                    new { message = "Product not found." });
            }

            if (request.Quantity > product.InventoryCount)
            {
                return Results.Conflict(
                    new { message = "Insufficient inventory." });
            }

            var purchase = new Purchase
            {
                ProductId = product.Id,
                BuyerAccountId = buyerAccountId,
                PriceAtPurchase = product.Price,
                PurchasedAt = DateTime.UtcNow
            };

            product.InventoryCount -= request.Quantity;

            db.Purchases.Add(purchase);

            await db.SaveChangesAsync();

            return Results.Created(
                $"/purchaseAPI/{purchase.Id}",
                new { purchase.Id });
        })
        .RequireAuthorization();
    }
}
