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
    [InlineData("Deployed to: \"https://quoted.vercel.app\"", "https://quoted.vercel.app")]
    [InlineData("Deployed to: 'https://single-quoted.onrender.com'", "https://single-quoted.onrender.com")]
    [InlineData("Production: http://insecure-http-endpoint.example.com", "http://insecure-http-endpoint.example.com")]
    [InlineData("Deployed to: https://trailing-slash.up.railway.app///", "https://trailing-slash.up.railway.app")]
    [InlineData("Deployed to: https://service.internal.io/api/v1/", "https://service.internal.io/api/v1")]
    // Case-Insensitive & Uppercase Scheme Invariants (Kills RegexOptions.IgnoreCase Mutants)
    [InlineData("Routing traffic: HTTPS://UPPERCASE-DEMO.VERCEL.APP", "https://uppercase-demo.vercel.app")]
    [InlineData("==> Deployed to HTTPS://SERVICE.ONRENDER.COM", "https://service.onrender.com")]
    [InlineData("Routing to Cloud Run: HTTPS://SAMPLE-APP.A.RUN.APP", "https://sample-app.a.run.app")]
    [InlineData("Firebase Hosting: HTTPS://SAMPLE-FIREBASE.WEB.APP", "https://sample-firebase.web.app")]
    [InlineData("Service URL: HTTPS://APP-XYZ.US-EAST-1.AWSAPPRUNNER.COM", "https://app-xyz.us-east-1.awsapprunner.com")]
    [InlineData("CloudFront: HTTPS://D999999ABCDEF9.CLOUDFRONT.NET", "https://d999999abcdef9.cloudfront.net")]
    [InlineData("AWS Amplify: HTTPS://PROD.AMPLIFYAPP.COM", "https://prod.amplifyapp.com")]
    [InlineData("Lambda function URL: HTTPS://FN123.LAMBDA-URL.US-WEST-2.ON.AWS", "https://fn123.lambda-url.us-west-2.on.aws")]
    [InlineData("Azure site live at: HTTPS://MY-APP.AZUREWEBSITES.NET", "https://my-app.azurewebsites.net")]
    [InlineData("Azure Static Web App: HTTPS://OCEAN-123.AZURESTATICAPPS.NET", "https://ocean-123.azurestaticapps.net")]
    [InlineData("Azure Container App: HTTPS://CONTAINER.AZURECONTAINERAPPS.IO", "https://container.azurecontainerapps.io")]
    [InlineData("DigitalOcean: HTTPS://SERVICE.ONDIGITALOCEAN.APP", "https://service.ondigitalocean.app")]
    [InlineData("Railway App: HTTPS://PROD.UP.RAILWAY.APP", "https://prod.up.railway.app")]
    [InlineData("Deployed to HTTPS://PROD-APP.RAILWAY.APP", "https://prod-app.railway.app")]
    [InlineData("production: HTTPS://CUSTOM-DOMAIN.ORG/API", "https://custom-domain.org/API")]
    [InlineData("url: HTTP://CASE-TEST.EXAMPLE.COM", "http://case-test.example.com")]
    [InlineData("App Runner endpoint: HTTPS://APP-XYZ.US-EAST-1.AWSAPPRUNNER.COM", "https://app-xyz.us-east-1.awsapprunner.com")]
    [InlineData("Invoking Lambda URL: HTTPS://FN123.LAMBDA-URL.US-WEST-2.ON.AWS", "https://fn123.lambda-url.us-west-2.on.aws")]
    [InlineData("Hosted on Railway: HTTPS://PROD.UP.RAILWAY.APP", "https://prod.up.railway.app")]
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
    [InlineData("Deployed to: https://")]
    [InlineData("Deployed to: http://")]
    public void ExtractUrl_NoUrl_ReturnsNull(string? logText)
    {
        var result = DeploymentUrlExtractor.ExtractUrl(logText);
        Assert.Null(result);
    }
}
