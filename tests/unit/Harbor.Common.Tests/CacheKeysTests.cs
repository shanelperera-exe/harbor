using Harbor.Caching;
using Xunit;

namespace Harbor.Common.Tests;

public class CacheKeysTests
{
    [Fact]
    public void AllCacheKeys_ReturnExpectedPatterns()
    {
        Assert.Equal("auth:user:42", CacheKeys.AuthUserById(42));
        Assert.Equal("auth:user:name:alice", CacheKeys.AuthUserByUsername("alice"));
        Assert.Equal("auth:pwreset:alice@test.com", CacheKeys.AuthPwReset("alice@test.com"));
        Assert.Equal("auth:revoked:jwt-123", CacheKeys.AuthRevokedToken("jwt-123"));

        Assert.Equal("proj:owner:5", CacheKeys.ProjectsByOwner(5));
        Assert.Equal("proj:all", CacheKeys.AllProjects());
        Assert.Equal("proj:id:10", CacheKeys.ProjectById(10));
        Assert.Equal("proj:pubid:prj-abc", CacheKeys.ProjectByPublicId("prj-abc"));

        Assert.Equal("svc:proj:10", CacheKeys.ServicesByProject(10));
        Assert.Equal("svc:id:20", CacheKeys.ServiceById(20));
        Assert.Equal("svc:pubid:svc-xyz", CacheKeys.ServiceByPublicId("svc-xyz"));

        Assert.Equal("env:id:30", CacheKeys.EnvById(30));
        Assert.Equal("env:proj:10", CacheKeys.EnvsByProject(10));
        Assert.Equal("env:secrets:names:30", CacheKeys.EnvSecretNames(30));

        Assert.Equal("deploy:hist:5:page1", CacheKeys.DeployHistory(5, "page1"));
        Assert.Equal("deploy:id:99", CacheKeys.DeployById(99));
        Assert.Equal("gh:token:install:12345", CacheKeys.GitHubInstallToken(12345));
        Assert.Equal("gh:ci:owner/repo/main", CacheKeys.GitHubCiStatus("owner", "repo", "main"));

        Assert.Equal("report:deploys:proj:10:7d", CacheKeys.ReportDeploymentsByProject(10, "7d"));
        Assert.Equal("report:success:svc:20", CacheKeys.ReportSuccessByService(20));
        Assert.Equal("report:dashboard:5", CacheKeys.ReportDashboard(5));
    }

    [Fact]
    public void CacheTtl_ValuesAreConfigured()
    {
        Assert.True(CacheTtl.Project > TimeSpan.Zero);
        Assert.True(CacheTtl.ProjectList > TimeSpan.Zero);
        Assert.True(CacheTtl.AllProjects > TimeSpan.Zero);
        Assert.True(CacheTtl.Service > TimeSpan.Zero);
        Assert.True(CacheTtl.ServiceList > TimeSpan.Zero);
        Assert.True(CacheTtl.UserProfile > TimeSpan.Zero);
        Assert.True(CacheTtl.PasswordReset > TimeSpan.Zero);
        Assert.True(CacheTtl.Environment > TimeSpan.Zero);
        Assert.True(CacheTtl.DeployHistory > TimeSpan.Zero);
        Assert.True(CacheTtl.DeployById > TimeSpan.Zero);
        Assert.True(CacheTtl.GitHubToken > TimeSpan.Zero);
        Assert.True(CacheTtl.GitHubCi > TimeSpan.Zero);
        Assert.True(CacheTtl.ReportAggregate > TimeSpan.Zero);
        Assert.True(CacheTtl.ReportDashboard > TimeSpan.Zero);
    }
}
