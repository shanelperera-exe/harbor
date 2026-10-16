using Harbor.Reporting.Adapters;
using Harbor.Reporting.Factories;
using Moq;
using Xunit;

namespace Harbor.Reporting.Tests;

public class ProviderAdapterFactoryTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void GetAdapter_NullOrWhitespace_ReturnsNull(string? providerName)
    {
        var factory = new ProviderAdapterFactory(new List<ILogProviderAdapter>());
        var result = factory.GetAdapter(providerName!);
        Assert.Null(result);
    }

    [Fact]
    public void GetAdapter_MatchingProvider_ReturnsAdapterIgnoringCase()
    {
        var mockAdapter = new Mock<ILogProviderAdapter>();
        mockAdapter.Setup(a => a.ProviderName).Returns("Docker");

        var factory = new ProviderAdapterFactory(new[] { mockAdapter.Object });
        var result = factory.GetAdapter("docker");

        Assert.NotNull(result);
        Assert.Equal("Docker", result.ProviderName);
    }

    [Fact]
    public void GetAdapter_NoMatchingProvider_ReturnsNull()
    {
        var mockAdapter = new Mock<ILogProviderAdapter>();
        mockAdapter.Setup(a => a.ProviderName).Returns("Render");

        var factory = new ProviderAdapterFactory(new[] { mockAdapter.Object });
        var result = factory.GetAdapter("aws");

        Assert.Null(result);
    }
}
