
using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

public static class SigninEndpoints
{
    public static void MapSigninEndpoints(this IEndpointRouteBuilder routes)
    {
        routes.MapPost("/accountAPI/signin", async (
            LoginRequest request,
            AccountDbContext db,
            IPasswordHasher<Account> passwordHasher,
            HttpContext httpContext) =>
        {
            var email = request.Email.Trim();

            var account = await db.Accounts.FirstOrDefaultAsync(
                a => a.Email.ToLower() == email.ToLower());

            if (account is null)
            {
                return Results.Unauthorized();
            }

            var passwordResult = passwordHasher.VerifyHashedPassword(
                account,
                account.Password,
                request.Password);

            if (passwordResult == PasswordVerificationResult.Failed)
            {
                return Results.Unauthorized();
            }

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, account.Id.ToString()),
                new Claim(ClaimTypes.Name, account.Email),
                new Claim(ClaimTypes.Email, account.Email)
            };

            var identity = new ClaimsIdentity(
                claims,
                CookieAuthenticationDefaults.AuthenticationScheme);

            var principal = new ClaimsPrincipal(identity);

            await httpContext.SignInAsync(
                CookieAuthenticationDefaults.AuthenticationScheme,
                principal);

            return Results.Ok(new { message = "Sign in successful" });
        });

        routes.MapGet("/accountAPI/me", (ClaimsPrincipal user) =>
        {
            return Results.Ok(new
            {
                email = user.FindFirst(ClaimTypes.Email)?.Value
            });
        }).RequireAuthorization();

        routes.MapPost("/accountAPI/logout", async (HttpContext httpContext) =>
        {
            await httpContext.SignOutAsync(
                CookieAuthenticationDefaults.AuthenticationScheme);

            return Results.Ok(new { message = "Logout successful" });
        }).RequireAuthorization();
    }
}

public record LoginRequest(string Email, string Password);
