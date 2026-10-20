using Microsoft.EntityFrameworkCore;

public static class AccountEndpoints
{
    public static void MapAccountEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/accountAPI");

        group.MapPost("/", async (Account newAccount, AccountDbContext db) =>
        {
            var emailExists = await db.Accounts
                .AnyAsync(a => a.Email.ToLower() == newAccount.Email.ToLower());

            if (emailExists)
            {
                return Results.Conflict(new { message = "Email already exists" });
            }

            newAccount.Id = 0; 
            db.Accounts.Add(newAccount);
            await db.SaveChangesAsync();

            return Results.Created($"/accountAPI/{newAccount.Id}", newAccount);
        });
    }
}
