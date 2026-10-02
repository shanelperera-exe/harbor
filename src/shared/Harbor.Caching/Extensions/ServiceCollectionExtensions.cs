using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Harbor.Caching.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddHarborCaching(this IServiceCollection services, IConfiguration configuration)
    {
        var redisConnectionString = configuration["REDIS_CONNECTION_STRING"] ?? "localhost:6379";
        var instanceName = configuration["REDIS_INSTANCE_NAME"] ?? "harbor:";

        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = redisConnectionString;
            options.InstanceName = instanceName;
        });

        services.AddSingleton<ICacheService, CacheService>();

        return services;
    }
}
