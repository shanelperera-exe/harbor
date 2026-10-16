using Harbor.Deployment.Data;
using Harbor.Deployment.Models;
using Harbor.Deployment.Repositories;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Harbor.Deployment.IntegrationTests;

public class NotificationRepositoryTests : IClassFixture<DeploymentApiFactory>
{
    private readonly DeploymentApiFactory _factory;
    private readonly NotificationRepository _repository;
    private readonly DeploymentRepository _deploymentRepo;

    public NotificationRepositoryTests(DeploymentApiFactory factory)
    {
        _factory = factory;
        var scope = _factory.Services.CreateScope();
        var dbFactory = scope.ServiceProvider.GetRequiredService<DbConnectionFactory>();
        _repository = new NotificationRepository(dbFactory);
        _deploymentRepo = new DeploymentRepository(dbFactory);
    }

    [Fact]
    public async Task NotificationRepository_FullCrudFlow_Succeeds()
    {
        var userId = DeploymentApiFactory.SeedOwnerId;
        var serviceId = DeploymentApiFactory.SeedServiceId;

        // Create a deployment first to associate notifications with
        var deploymentId = await _deploymentRepo.CreateAsync(new DeploymentEntity
        {
            ServiceId = serviceId,
            OwnerId = userId,
            Environment = "Production",
            Version = "v1.2.3",
            Status = "Queued"
        });

        // 1. CreateAsync
        var notif1 = new NotificationEntity
        {
            UserId = userId,
            DeploymentId = deploymentId,
            Type = "DeploymentStarted",
            Title = "Deployment Started",
            Message = "Production deployment v1.2.3 has started."
        };
        var notif1Id = await _repository.CreateAsync(notif1);
        Assert.True(notif1Id > 0);

        var notif2 = new NotificationEntity
        {
            UserId = userId,
            DeploymentId = deploymentId,
            Type = "DeploymentSucceeded",
            Title = "Deployment Succeeded",
            Message = "Production deployment v1.2.3 finished successfully."
        };
        var notif2Id = await _repository.CreateAsync(notif2);
        Assert.True(notif2Id > 0);

        // 2. GetUnreadCountAsync
        var unreadCount = await _repository.GetUnreadCountAsync(userId);
        Assert.True(unreadCount >= 2);

        // 3. GetByUserIdAsync
        var list = await _repository.GetByUserIdAsync(userId, 10);
        Assert.NotEmpty(list);
        Assert.Contains(list, n => n.Id == notif1Id);
        Assert.Contains(list, n => n.Id == notif2Id);

        // 4. MarkAsReadAsync
        var markResult = await _repository.MarkAsReadAsync(notif1Id, userId);
        Assert.True(markResult);

        var countAfterOneRead = await _repository.GetUnreadCountAsync(userId);
        Assert.Equal(unreadCount - 1, countAfterOneRead);

        // MarkAsReadAsync for another user should return false
        var wrongUserMark = await _repository.MarkAsReadAsync(notif2Id, 999999);
        Assert.False(wrongUserMark);

        // 5. MarkAllAsReadAsync
        await _repository.MarkAllAsReadAsync(userId);

        var finalCount = await _repository.GetUnreadCountAsync(userId);
        Assert.Equal(0, finalCount);
    }
}
