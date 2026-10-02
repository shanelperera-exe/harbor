using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace Harbor.Caching.Middleware;

public class TokenBlacklistMiddleware
{
    private readonly RequestDelegate _next;

    public TokenBlacklistMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ICacheService cache)
    {
        if (context.User.Identity?.IsAuthenticated == true)
        {
            var jti = context.User.FindFirstValue("jti");
            
            if (!string.IsNullOrEmpty(jti))
            {
                // Check if the token has been revoked
                var isRevoked = await cache.GetAsync<bool>(CacheKeys.AuthRevokedToken(jti));
                if (isRevoked)
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return;
                }
            }
        }

        await _next(context);
    }
}
