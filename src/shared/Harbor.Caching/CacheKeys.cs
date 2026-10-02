namespace Harbor.Caching;

public static class CacheKeys
{
    // Authentication
    public static string AuthUserById(int userId) => $"auth:user:{userId}";
    public static string AuthUserByUsername(string username) => $"auth:user:name:{username}";
    public static string AuthPwReset(string email) => $"auth:pwreset:{email}";
    public static string AuthRevokedToken(string jti) => $"auth:revoked:{jti}";

    // Project
    public static string ProjectsByOwner(int userId) => $"proj:owner:{userId}";
    public static string AllProjects() => "proj:all";
    public static string ProjectById(int id) => $"proj:id:{id}";
    public static string ProjectByPublicId(string publicId) => $"proj:pubid:{publicId}";
    
    // Services
    public static string ServicesByProject(int projectId) => $"svc:proj:{projectId}";
    public static string ServiceById(int serviceId) => $"svc:id:{serviceId}";
    public static string ServiceByPublicId(string publicId) => $"svc:pubid:{publicId}";

    // Environment
    public static string EnvById(int envId) => $"env:id:{envId}";
    public static string EnvsByProject(int projectId) => $"env:proj:{projectId}";
    public static string EnvSecretNames(int envId) => $"env:secrets:names:{envId}";

    // Deployment
    public static string DeployHistory(int ownerId, string pageKey) => $"deploy:hist:{ownerId}:{pageKey}";
    public static string DeployById(int deployId) => $"deploy:id:{deployId}";
    public static string GitHubInstallToken(long installId) => $"gh:token:install:{installId}";
    public static string GitHubCiStatus(string owner, string repo, string refHash) => $"gh:ci:{owner}/{repo}/{refHash}";

    // Reporting
    public static string ReportDeploymentsByProject(int projectId, string timeframe) => $"report:deploys:proj:{projectId}:{timeframe}";
    public static string ReportSuccessByService(int serviceId) => $"report:success:svc:{serviceId}";
    public static string ReportDashboard(int userId) => $"report:dashboard:{userId}";
}

public static class CacheTtl
{
    public static readonly TimeSpan Project = TimeSpan.FromMinutes(10);
    public static readonly TimeSpan ProjectList = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan AllProjects = TimeSpan.FromMinutes(2);
    public static readonly TimeSpan Service = TimeSpan.FromMinutes(10);
    public static readonly TimeSpan ServiceList = TimeSpan.FromMinutes(5);
    
    public static readonly TimeSpan UserProfile = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan PasswordReset = TimeSpan.FromHours(1);
    
    public static readonly TimeSpan Environment = TimeSpan.FromMinutes(5);
    
    public static readonly TimeSpan DeployHistory = TimeSpan.FromSeconds(30);
    public static readonly TimeSpan DeployById = TimeSpan.FromMinutes(1);
    public static readonly TimeSpan GitHubToken = TimeSpan.FromMinutes(55);
    public static readonly TimeSpan GitHubCi = TimeSpan.FromSeconds(30);
    
    public static readonly TimeSpan ReportAggregate = TimeSpan.FromMinutes(5);
    public static readonly TimeSpan ReportDashboard = TimeSpan.FromMinutes(2);
}
