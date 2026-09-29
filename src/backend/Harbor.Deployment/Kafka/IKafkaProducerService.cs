using Harbor.Contracts.Kafka;

namespace Harbor.Deployment.Kafka;

public interface IKafkaProducerService
{
    Task PublishDeploymentEventAsync(DeploymentLifecycleEvent @event);
}
