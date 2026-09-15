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

        private static async Task<ProjectResponse> CreateProjectAsync(HttpClient client, string? name = null)
        {
            var response = await client.PostAsJsonAsync("/api/projects", new CreateProjectRequest
            {
                Name = name ?? UniqueName("project")
            });
            var body = await response.Content.ReadFromJsonAsync<ApiResponse<ProjectResponse>>();
            return body!.Data!;
        }

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

        // ---------- Scenario 1: Update project ----------

        [Fact]
        public async Task Update_ValidRequest_PersistsChanges()
        {
            // Arrange
            const int ownerId = 5001;
            var client = CreateAuthenticatedClient(ownerId);
            var project = await CreateProjectAsync(client, UniqueName("update-me"));
            var newName = UniqueName("updated-name");

            var request = new UpdateProjectRequest
            {
                Name = newName,
                Description = "Updated via integration test",
                RepositoryUrl = "https://github.com/team/updated-repo"
            };

            // Act
            var response = await client.PutAsJsonAsync($"/api/projects/{project.Id}", request);

            // Assert: the HTTP response itself
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await response.Content.ReadFromJsonAsync<ApiResponse<ProjectResponse>>();
            Assert.Equal(newName, body!.Data!.Name);
            Assert.Equal("Updated via integration test", body.Data.Description);

            // Assert: the change is actually persisted, not just echoed back
            var listResponse = await client.GetAsync("/api/projects");
            var list = await listResponse.Content.ReadFromJsonAsync<ApiResponse<List<ProjectResponse>>>();
            Assert.Contains(list!.Data!, p => p.Id == project.Id && p.Name == newName);
        }

        [Fact]
        public async Task Update_MissingName_Returns400()
        {
            // Arrange
            var client = CreateAuthenticatedClient(userId: 5002);
            var project = await CreateProjectAsync(client);

            // Act
            var response = await client.PutAsJsonAsync($"/api/projects/{project.Id}", new UpdateProjectRequest { Name = "" });

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Update_NonExistentProject_Returns400()
        {
            // Arrange
            var client = CreateAuthenticatedClient(userId: 5003);

            // Act
            var response = await client.PutAsJsonAsync("/api/projects/999999", new UpdateProjectRequest { Name = "does-not-matter" });

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Update_ArchivedProject_Returns400()
        {
            // Arrange
            var client = CreateAuthenticatedClient(userId: 5004);
            var project = await CreateProjectAsync(client);
            await client.PostAsync($"/api/projects/{project.Id}/archive", content: null);

            // Act
            var response = await client.PutAsJsonAsync($"/api/projects/{project.Id}", new UpdateProjectRequest { Name = UniqueName("cant-touch-this") });

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Update_NoAuthToken_Returns401()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.PutAsJsonAsync("/api/projects/1", new UpdateProjectRequest { Name = "does-not-matter" });

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        // ---------- Scenario 3: Unauthorized update ----------

        [Fact]
        public async Task Update_ByNonOwner_Returns403()
        {
            // Arrange
            var owner = CreateAuthenticatedClient(userId: 5005);
            var intruder = CreateAuthenticatedClient(userId: 5006);
            var project = await CreateProjectAsync(owner);

            // Act
            var response = await intruder.PutAsJsonAsync($"/api/projects/{project.Id}", new UpdateProjectRequest { Name = UniqueName("hijacked") });

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }

        [Fact]
        public async Task Update_ByAdmin_OnOtherUsersProject_Returns200()
        {
            // Arrange
            var owner = CreateAuthenticatedClient(5007, Roles.User);
            var admin = CreateAuthenticatedClient(5008, Roles.Admin);
            var project = await CreateProjectAsync(owner);
            var newName = UniqueName("admin-updated");

            // Act
            var response = await admin.PutAsJsonAsync($"/api/projects/{project.Id}", new UpdateProjectRequest { Name = newName });

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }

        // ---------- Scenario 2: Archive project ----------

        [Fact]
        public async Task Archive_ValidRequest_RemovesFromActiveList()
        {
            // Arrange
            var client = CreateAuthenticatedClient(userId: 6001);
            var project = await CreateProjectAsync(client);

            // Act
            var response = await client.PostAsync($"/api/projects/{project.Id}/archive", content: null);

            // Assert: the HTTP response itself
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            // Assert: it no longer appears as an active project
            var listResponse = await client.GetAsync("/api/projects");
            var list = await listResponse.Content.ReadFromJsonAsync<ApiResponse<List<ProjectResponse>>>();
            Assert.DoesNotContain(list!.Data!, p => p.Id == project.Id);
        }

        [Fact]
        public async Task Archive_AlreadyArchived_Returns400()
        {
            // Arrange
            var client = CreateAuthenticatedClient(userId: 6002);
            var project = await CreateProjectAsync(client);
            await client.PostAsync($"/api/projects/{project.Id}/archive", content: null);

            // Act: archive it a second time
            var response = await client.PostAsync($"/api/projects/{project.Id}/archive", content: null);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Archive_NonExistentProject_Returns400()
        {
            // Arrange
            var client = CreateAuthenticatedClient(userId: 6003);

            // Act
            var response = await client.PostAsync("/api/projects/999999/archive", content: null);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Archive_NoAuthToken_Returns401()
        {
            // Arrange
            var client = _factory.CreateClient();

            // Act
            var response = await client.PostAsync("/api/projects/1/archive", content: null);

            // Assert
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        // ---------- Scenario 3: Unauthorized archive ----------

        [Fact]
        public async Task Archive_ByNonOwner_Returns403()
        {
            // Arrange
            var owner = CreateAuthenticatedClient(userId: 6004);
            var intruder = CreateAuthenticatedClient(userId: 6005);
            var project = await CreateProjectAsync(owner);

            // Act
            var response = await intruder.PostAsync($"/api/projects/{project.Id}/archive", content: null);

            // Assert
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);

            // Assert: it's still active, since the rejected attempt must not have mutated it
            var listResponse = await owner.GetAsync("/api/projects");
            var list = await listResponse.Content.ReadFromJsonAsync<ApiResponse<List<ProjectResponse>>>();
            Assert.Contains(list!.Data!, p => p.Id == project.Id);
        }

        [Fact]
        public async Task Archive_ByAdmin_OnOtherUsersProject_Returns200()
        {
            // Arrange
            var owner = CreateAuthenticatedClient(6006, Roles.User);
            var admin = CreateAuthenticatedClient(6007, Roles.Admin);
            var project = await CreateProjectAsync(owner);

            // Act
            var response = await admin.PostAsync($"/api/projects/{project.Id}/archive", content: null);

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}