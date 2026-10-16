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
    [InlineData("Firebase Hosting: https://sample-app-123.web.app", "https://sample-app-123.web.app")]
    [InlineData("AWS Amplify: https://branch.amplifyapp.com", "https://branch.amplifyapp.com")]
    [InlineData("Lambda function URL: https://abc-def.lambda-url.us-west-2.on.aws", "https://abc-def.lambda-url.us-west-2.on.aws")]
    [InlineData("Azure site live at: https://my-app.azurewebsites.net.", "https://my-app.azurewebsites.net")]
    [InlineData("Azure Static Web App: https://mango-ocean-123.azurestaticapps.net/", "https://mango-ocean-123.azurestaticapps.net")]
    [InlineData("Azure Container App: https://my-container.azurecontainerapps.io", "https://my-container.azurecontainerapps.io")]
    [InlineData("DigitalOcean App Platform: https://api-service-xyz.ondigitalocean.app", "https://api-service-xyz.ondigitalocean.app")]
    [InlineData("Railway App: https://my-service-production.up.railway.app", "https://my-service-production.up.railway.app")]
    [InlineData("Deployed to https://my-railway-app.railway.app", "https://my-railway-app.railway.app")]
    [InlineData("Production: https://custom-endpoint.example.com", "https://custom-endpoint.example.com")]
    [InlineData("Deployed to: https://service.internal.io;", "https://service.internal.io")]
    [InlineData("Deployment URL: https://app.company.org/path", "https://app.company.org/path")]
    [InlineData("Endpoint: https://api.sample.com", "https://api.sample.com")]
    [InlineData("URL: https://web.sample.com/", "https://web.sample.com")]
    public void ExtractUrl_ExtractsValidProviderUrls(string logText, string expectedUrl)
    {
        var result = DeploymentUrlExtractor.ExtractUrl(logText);
        Assert.Equal(expectedUrl, result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("Build succeeded with 0 warnings.")]
    [InlineData("npm run build completed in 2.3s")]
    [InlineData("Production: not-a-valid-url")]
    [InlineData("Deployed to: ftp://invalid-scheme.com")]
    public void ExtractUrl_NoUrl_ReturnsNull(string? logText)
    {
        var result = DeploymentUrlExtractor.ExtractUrl(logText);
        Assert.Null(result);
    }
}
