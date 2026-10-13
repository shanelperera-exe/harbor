using Harbor.Deployment.Services;
using Xunit;

namespace Harbor.Deployment.Tests;

public class DeploymentUrlExtractorTests
{
    [Theory]
    [InlineData("Routing traffic to edge node: https://portfolio-59rxk8ch0-shanelperera-exes-projects.vercel.app", "https://portfolio-59rxk8ch0-shanelperera-exes-projects.vercel.app")]
    [InlineData("Aliased to https://portfolio-app.vercel.app [1s]", "https://portfolio-app.vercel.app")]
    [InlineData("==> Deployed to https://my-service.onrender.com", "https://my-service.onrender.com")]
    [InlineData("Service URL: https://app-xyz.us-east-1.awsapprunner.com", "https://app-xyz.us-east-1.awsapprunner.com")]
    [InlineData("CloudFront Distribution: https://d111111abcdef8.cloudfront.net", "https://d111111abcdef8.cloudfront.net")]
    [InlineData("Routing to Cloud Run: https://sample-app-ab12cd34-ue.a.run.app", "https://sample-app-ab12cd34-ue.a.run.app")]
    [InlineData("Azure site live at: https://my-app.azurewebsites.net.", "https://my-app.azurewebsites.net")]
    [InlineData("DigitalOcean App Platform: https://api-service-xyz.ondigitalocean.app", "https://api-service-xyz.ondigitalocean.app")]
    [InlineData("Production: https://custom-endpoint.example.com", "https://custom-endpoint.example.com")]
    public void ExtractUrl_ExtractsValidProviderUrls(string logText, string expectedUrl)
    {
        var result = DeploymentUrlExtractor.ExtractUrl(logText);
        Assert.Equal(expectedUrl, result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Build succeeded with 0 warnings.")]
    [InlineData("npm run build completed in 2.3s")]
    public void ExtractUrl_NoUrl_ReturnsNull(string? logText)
    {
        var result = DeploymentUrlExtractor.ExtractUrl(logText);
        Assert.Null(result);
    }
}
