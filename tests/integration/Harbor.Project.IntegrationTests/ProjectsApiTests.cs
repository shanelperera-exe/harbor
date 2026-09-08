using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Responses;
using Xunit;

namespace Harbor.Project.IntegrationTests
{
    public class ProjectsApiTests : IClassFixture<ProjectApiFactory>
    {
        private readonly ProjectApiFactory _factory;

        public ProjectsApiTests(ProjectApiFactory factory)
        {
            _factory = factory;
        }

        private HttpClient CreateAuthenticatedClient(int userId, string role = Roles.User)
        {
            var client = _factory.CreateClient();
            var token = TestJwtFactory.CreateToken(userId, role);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            return client;
        }

        // Every test uses a unique name so parallel/repeated runs against the
        // same container never collide with the "duplicate name" rule.
        // Guid.NewGuid():N is 32 chars, so prefix + dash + suffix stays well
        // under the model's 100-character limit for any reasonable prefix.
        private static string UniqueName(string prefix) => $"{prefix}-{Guid.NewGuid():N}";

        // ---------- Scenario 1: Create project ----------

        [Fact]
        public async Task Create_ValidRequest_PersistsAndReturns201()
        {
            // Arrange
            var client = CreateAuthenticatedClient(userId: 1001);
            var request = new CreateProjectRequest
            {
                Name = UniqueName("harbor-api"),
                Description = "Integration test project",
                RepositoryUrl = "https://github.com/team/harbor-api"
            };

            // Act
            var response = await client.PostAsJsonAsync("/api/projects", request);

            // Assert: the HTTP response itself
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var created = await response.Content.ReadFromJsonAsync<ApiResponse<ProjectResponse>>();
            Assert.NotNull(created?.Data);
            Assert.Equal(request.Name, created!.Data!.Name);
            Assert.True(created.Data.Id > 0);

            // Assert: it was actually persisted to Postgres, not just echoed back.
            // We prove this by fetching it back through the real GET endpoint.
            var listResponse = await client.GetAsync("/api/projects");
            var list = await listResponse.Content.ReadFromJsonAsync<ApiResponse<List<ProjectResponse>>>();
            Assert.Contains(list!.Data!, p => p.Name == request.Name);
        }

        // ---------- Scenario 2: View projects ----------

        [Fact]
        public async Task GetAll_ReturnsOnlyProjectsOwnedByCaller()
        {
            // Arrange: two different users, each creating their own project
            const int ownerAId = 2001;
            const int ownerBId = 2002;
            var clientA = CreateAuthenticatedClient(ownerAId);
            var clientB = CreateAuthenticatedClient(ownerBId);

            var nameA = UniqueName("owner-a-project");
            var nameB = UniqueName("owner-b-project");

            await clientA.PostAsJsonAsync("/api/projects", new CreateProjectRequest { Name = nameA });
            await clientB.PostAsJsonAsync("/api/projects", new CreateProjectRequest { Name = nameB });

            // Act
            var response = await clientA.GetAsync("/api/projects");
            var body = await response.Content.ReadFromJsonAsync<ApiResponse<List<ProjectResponse>>>();

            // Assert: owner A sees their own project, never owner B's
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Contains(body!.Data!, p => p.Name == nameA);
            Assert.DoesNotContain(body.Data!, p => p.Name == nameB);
        }

        [Fact]
        public async Task GetAll_AdminSeesProjectsFromOtherUsers()
        {
            // Arrange
            const int regularUserId = 3001;
            const int adminUserId = 3002;
            var regularClient = CreateAuthenticatedClient(regularUserId, Roles.User);
            var adminClient = CreateAuthenticatedClient(adminUserId, Roles.Admin);

            var projectName = UniqueName("regular-users-project");
            await regularClient.PostAsJsonAsync("/api/projects", new CreateProjectRequest { Name = projectName });

            // Act
            var response = await adminClient.GetAsync("/api/projects");
            var body = await response.Content.ReadFromJsonAsync<ApiResponse<List<ProjectResponse>>>();

            // Assert: the Admin role can see a project it does not own
            Assert.Contains(body!.Data!, p => p.Name == projectName);
        }

        // ---------- Scenario 3: Invalid project data ----------

        [Fact]
        public async Task Create_MissingName_Returns400WithValidationDetail()
        {
            // Arrange
            var client = CreateAuthenticatedClient(userId: 4001);
            var request = new CreateProjectRequest { Name = "" };

            // Act
            var response = await client.PostAsJsonAsync("/api/projects", request);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            var body = await response.Content.ReadAsStringAsync();
            Assert.Contains("required", body, StringComparison.OrdinalIgnoreCase);
        }

        [Fact]
        public async Task Create_DuplicateNameForSameOwner_Returns400()
        {
            // Arrange
            var client = CreateAuthenticatedClient(userId: 4002);
            var name = UniqueName("duplicate-project");
            await client.PostAsJsonAsync("/api/projects", new CreateProjectRequest { Name = name });

            // Act: submit the exact same name again for the same owner
            var response = await client.PostAsJsonAsync("/api/projects", new CreateProjectRequest { Name = name });

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        // ---------- Unauthorized access ----------

        [Fact]
        public async Task Create_NoAuthToken_Returns401()
        {
            // Arrange: a client with no Authorization header at all
            var client = _factory.CreateClient();
            var request = new CreateProjectRequest { Name = UniqueName("should-not-be-created") };

            // Act
            var response = await client.PostAsJsonAsync("/api/projects", request);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task GetAll_NoAuthToken_Returns401()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.GetAsync("/api/projects");

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }
}
