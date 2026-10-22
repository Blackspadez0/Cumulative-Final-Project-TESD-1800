
using Microsoft.EntityFrameworkCore;

public static class ProductEndpoints
{
    public static void MapProductEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/productAPI");

        // Listing products remains public.
        group.MapGet("/", async (ProductDbContext db) =>
            await db.Products.ToListAsync());

        // Creating products requires an authenticated user.
        group.MapPost("/", async (Product product, ProductDbContext db) =>
        {
            product.Id = 0;
            db.Products.Add(product);
            await db.SaveChangesAsync();

            return Results.Created($"/productAPI/{product.Id}", product);
        }).RequireAuthorization();
    }
}
