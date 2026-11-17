using Microsoft.Extensions.DependencyInjection;

namespace Harbor.Common.Messaging;

public static class MessagingServiceCollectionExtensions
{
    public static IServiceCollection AddHarborKafkaMessaging(this IServiceCollection services, string defaultConsumerGroupId)
    {
        services.Configure<HarborKafkaOptions>(opts =>
        {
            var env = HarborKafkaOptions.FromEnvironment(defaultConsumerGroupId);
            opts.BootstrapServers = env.BootstrapServers;
            opts.DomainEventsTopic = env.DomainEventsTopic;
            opts.DeploymentTopic = env.DeploymentTopic;
            opts.ConsumerGroupId = env.ConsumerGroupId;
            opts.SaslUsername = env.SaslUsername;
            opts.SaslPassword = env.SaslPassword;
            opts.SecurityProtocol = env.SecurityProtocol;
            opts.SaslMechanism = env.SaslMechanism;
            opts.ConnectionString = env.ConnectionString;
            opts.AutoOffsetReset = env.AutoOffsetReset;
        });

        services.AddSingleton<IHarborEventPublisher, KafkaEventPublisher>();
        return services;
    }
}
