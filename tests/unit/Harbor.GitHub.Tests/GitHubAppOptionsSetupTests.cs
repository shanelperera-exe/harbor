using Harbor.GitHub.Services;
using Xunit;

namespace Harbor.GitHub.Tests;

[Collection("GitHubEnvVars")]
public class GitHubAppOptionsSetupTests : IDisposable
{
    private static readonly string[] Vars =
    {
        "GH_APP_ID", "GITHUB_APP_ID", "GH_APP_CLIENT_ID", "GITHUB_APP_CLIENT_ID",
        "GH_APP_CLIENT_SECRET", "GITHUB_APP_CLIENT_SECRET", "GH_APP_PRIVATE_KEY_BASE64",
        "GITHUB_APP_PRIVATE_KEY_BASE64", "GH_APP_SLUG", "GITHUB_APP_SLUG",
        "GH_APP_WEBHOOK_SECRET", "GITHUB_APP_WEBHOOK_SECRET", "GH_API_BASE_URL",
        "GITHUB_API_BASE_URL", "API_GATEWAY_URL"
    };

    public GitHubAppOptionsSetupTests() => Clear();
    public void Dispose() => Clear();

    private static void Clear()
    {
        foreach (var v in Vars) Environment.SetEnvironmentVariable(v, null);
    }

    private static GitHubAppOptions Configure()
    {
        var options = new GitHubAppOptions();
        new GitHubAppOptionsSetup().Configure(options);
        return options;
    }

    [Fact]
    public void Configure_NoEnvVars_UsesDefaults()
    {
        var o = Configure();
        Assert.Equal(0, o.AppId);
        Assert.Equal(string.Empty, o.ClientId);
        Assert.Equal(string.Empty, o.ClientSecret);
        Assert.Equal(string.Empty, o.PrivateKeyBase64);
        Assert.Equal(string.Empty, o.Slug);
        Assert.Equal(string.Empty, o.WebhookSecret);
        Assert.Equal("https://api.github.com/", o.ApiBaseUrl);
    }

    [Fact]
    public void Configure_PrimaryEnvVars_AreUsed()
    {
        Environment.SetEnvironmentVariable("GH_APP_ID", "42");
        Environment.SetEnvironmentVariable("GH_APP_CLIENT_ID", "cid");
        Environment.SetEnvironmentVariable("GH_APP_CLIENT_SECRET", "sec");
        Environment.SetEnvironmentVariable("GH_APP_PRIVATE_KEY_BASE64", "key");
        Environment.SetEnvironmentVariable("GH_APP_SLUG", "slug");
        Environment.SetEnvironmentVariable("GH_APP_WEBHOOK_SECRET", "wh");
        Environment.SetEnvironmentVariable("GH_API_BASE_URL", "https://ghe.local/api/");
        Environment.SetEnvironmentVariable("API_GATEWAY_URL", "https://gw.example.com///");

        var o = Configure();
        Assert.Equal(42, o.AppId);
        Assert.Equal("cid", o.ClientId);
        Assert.Equal("sec", o.ClientSecret);
        Assert.Equal("key", o.PrivateKeyBase64);
        Assert.Equal("slug", o.Slug);
        Assert.Equal("wh", o.WebhookSecret);
        Assert.Equal("https://ghe.local/api/", o.ApiBaseUrl);
        Assert.Equal("https://gw.example.com", o.ApiOrigin);
    }

    [Fact]
    public void Configure_LegacyFallbackEnvVars_AreUsed()
    {
        Environment.SetEnvironmentVariable("GITHUB_APP_ID", "7");
        Environment.SetEnvironmentVariable("GITHUB_APP_CLIENT_ID", "lcid");
        Environment.SetEnvironmentVariable("GITHUB_APP_CLIENT_SECRET", "lsec");
        Environment.SetEnvironmentVariable("GITHUB_APP_PRIVATE_KEY_BASE64", "lkey");
        Environment.SetEnvironmentVariable("GITHUB_APP_SLUG", "lslug");
        Environment.SetEnvironmentVariable("GITHUB_APP_WEBHOOK_SECRET", "lwh");
        Environment.SetEnvironmentVariable("GITHUB_API_BASE_URL", "https://legacy/");

        var o = Configure();
        Assert.Equal(7, o.AppId);
        Assert.Equal("lcid", o.ClientId);
        Assert.Equal("lsec", o.ClientSecret);
        Assert.Equal("lkey", o.PrivateKeyBase64);
        Assert.Equal("lslug", o.Slug);
        Assert.Equal("lwh", o.WebhookSecret);
        Assert.Equal("https://legacy/", o.ApiBaseUrl);
    }

    [Fact]
    public void Configure_NonNumericAppId_FallsBackToZero()
    {
        Environment.SetEnvironmentVariable("GH_APP_ID", "not-a-number");
        Assert.Equal(0, Configure().AppId);
    }

    [Fact]
    public void Configure_BlankGatewayUrl_LeavesApiOriginUnchanged()
    {
        var defaultOrigin = new GitHubAppOptions().ApiOrigin;
        Environment.SetEnvironmentVariable("API_GATEWAY_URL", "   ");
        Assert.Equal(defaultOrigin, Configure().ApiOrigin);
    }
}
