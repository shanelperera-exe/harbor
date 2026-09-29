using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Responses;
using Xunit;

namespace Harbor.Project.IntegrationTests
{
    /// <summary>
    /// Exercises the services API end to end against a real Postgres container:
    /// Controller -> Service -> Repository -> database. The services endpoints had unit
    /// coverage only, so this verifies the wiring, routing, persistence, and authorization
    /// that only a full-stack test can prove.
    /// </summary>
    public class ServicesApiTests : IClassFixture<ProjectApiFactory>
    {
        private readonly ProjectApiFactory _factory;

        public ServicesApiTests(ProjectApiFactory factory)
        {
            _factory = factory;
        }

        private HttpClient CreateAuthenticatedClient(int userId, string role = Roles.User)
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", TestJwtFactory.CreateToken(userId, role));
            return client;
        }

        private static string UniqueName(string prefix) => $"{prefix}-{Guid.NewGuid():N}";

        /// <summary>Creates a project owned by <paramref name="ownerId"/> and returns it.</summary>
        private async Task<ProjectResponse> CreateProjectAsync(HttpClient client, int ownerId)
        {
            var response = await client.PostAsJsonAsync("/api/projects", new CreateProjectRequest
            {
                Name = UniqueName("svc-project")
            });
            var body = await response.Content.ReadFromJsonAsync<ApiResponse<ProjectResponse>>();
            return body!.Data!;
        }

        private static CreateServiceRequest ValidServiceRequest(string name) => new()
        {
            Name = name,
            Type = "Backend",
            RepositoryUrl = "https://github.com/acme/api",
            RepositoryName = "acme/api",
            RepositoryBranch = "main",
            WorkflowFile = "deploy.yml"
        };

        // ---------- Create service ----------

        [Fact]
        public async Task Create_ValidRequest_PersistsAndReturns201()
        {
            var client = CreateAuthenticatedClient(userId: 2001);
            var project = await CreateProjectAsync(client, 2001);
            var name = UniqueName("api");

            var response = await client.PostAsJsonAsync($"/api/projects/{project.PublicId}/services", ValidServiceRequest(name));

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            var created = await response.Content.ReadFromJsonAsync<ApiResponse<ServiceResponse>>();
            Assert.NotNull(created?.Data);
            Assert.Equal(name, created!.Data!.Name);
            Assert.Equal("Backend", created.Data.Type);
            Assert.StartsWith("srv-", created.Data.PublicId);

            // Prove it was persisted, not just echoed back.
            var listResponse = await client.GetAsync($"/api/projects/{project.PublicId}/services");
            var list = await listResponse.Content.ReadFromJsonAsync<ApiResponse<List<ServiceResponse>>>();
            Assert.Contains(list!.Data!, s => s.PublicId == created.Data.PublicId);
        }

        [Fact]
        public async Task Create_DefaultWorkflowFileIsApplied_WhenOmitted()
        {
            var client = CreateAuthenticatedClient(userId: 2002);
            var project = await CreateProjectAsync(client, 2002);

            var request = ValidServiceRequest(UniqueName("api"));
            request.WorkflowFile = null;

            var response = await client.PostAsJsonAsync($"/api/projects/{project.PublicId}/services", request);
            var created = await response.Content.ReadFromJsonAsync<ApiResponse<ServiceResponse>>();

            Assert.Equal("deploy.yml", created!.Data!.WorkflowFile);
        }

        [Fact]
        public async Task Create_RepositoryUrlWithoutBranchOrCommit_Returns400()
        {
            var client = CreateAuthenticatedClient(userId: 2003);
            var project = await CreateProjectAsync(client, 2003);

            var request = ValidServiceRequest(UniqueName("api"));
            request.RepositoryBranch = null;
            request.RepositoryCommit = null;

            var response = await client.PostAsJsonAsync($"/api/projects/{project.PublicId}/services", request);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Create_NonOwnerNonAdmin_Returns400()
        {
            var owner = CreateAuthenticatedClient(userId: 2004);
            var project = await CreateProjectAsync(owner, 2004);

            var intruder = CreateAuthenticatedClient(userId: 9999);
            var response = await intruder.PostAsJsonAsync(
                $"/api/projects/{project.PublicId}/services",
                ValidServiceRequest(UniqueName("api")));

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Create_AdminCanAddServiceToAnotherUsersProject()
        {
            var owner = CreateAuthenticatedClient(userId: 2005);
            var project = await CreateProjectAsync(owner, 2005);

            var admin = CreateAuthenticatedClient(userId: 9999, Roles.Admin);
            var response = await admin.PostAsJsonAsync(
                $"/api/projects/{project.PublicId}/services",
                ValidServiceRequest(UniqueName("api")));

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        }

        [Fact]
        public async Task Create_UnauthenticatedRequest_Returns401()
        {
            var client = _factory.CreateClient();

            var response = await client.PostAsJsonAsync(
                "/api/projects/prj-anything/services",
                ValidServiceRequest(UniqueName("api")));

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        [Fact]
        public async Task Create_NonExistentProject_Returns400()
        {
            var client = CreateAuthenticatedClient(userId: 2006);

            var response = await client.PostAsJsonAsync(
                "/api/projects/prj-doesnotexist/services",
                ValidServiceRequest(UniqueName("api")));

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        // ---------- List services ----------

        [Fact]
        public async Task GetByProjectId_ReturnsServicesForProject()
        {
            var client = CreateAuthenticatedClient(userId: 2007);
            var project = await CreateProjectAsync(client, 2007);

            var first = UniqueName("api");
            var second = UniqueName("web");
            await client.PostAsJsonAsync($"/api/projects/{project.PublicId}/services", ValidServiceRequest(first));
            await client.PostAsJsonAsync($"/api/projects/{project.PublicId}/services", ValidServiceRequest(second));

            var response = await client.GetAsync($"/api/projects/{project.PublicId}/services");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var list = await response.Content.ReadFromJsonAsync<ApiResponse<List<ServiceResponse>>>();
            Assert.Contains(list!.Data!, s => s.Name == first);
            Assert.Contains(list!.Data!, s => s.Name == second);
        }

        [Fact]
        public async Task GetByProjectId_NonOwnerNonAdmin_Returns400()
        {
            var owner = CreateAuthenticatedClient(userId: 2008);
            var project = await CreateProjectAsync(owner, 2008);

            var intruder = CreateAuthenticatedClient(userId: 9999);
            var response = await intruder.GetAsync($"/api/projects/{project.PublicId}/services");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task GetByProjectId_UnauthenticatedRequest_Returns401()
        {
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/projects/prj-anything/services");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        // ---------- Get single service ----------

        [Fact]
        public async Task GetById_Owner_ReturnsService()
        {
            var client = CreateAuthenticatedClient(userId: 2009);
            var project = await CreateProjectAsync(client, 2009);
            var name = UniqueName("api");

            var created = await client.PostAsJsonAsync(
                $"/api/projects/{project.PublicId}/services",
                ValidServiceRequest(name));
            var createdBody = await created.Content.ReadFromJsonAsync<ApiResponse<ServiceResponse>>();

            var response = await client.GetAsync($"/api/projects/{project.PublicId}/services/{createdBody!.Data!.PublicId}");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var body = await response.Content.ReadFromJsonAsync<ApiResponse<ServiceResponse>>();
            Assert.Equal(name, body!.Data!.Name);
            Assert.Equal(createdBody.Data.PublicId, body.Data.PublicId);
        }

        [Fact]
        public async Task GetById_UnknownService_Returns404()
        {
            var client = CreateAuthenticatedClient(userId: 2010);
            var project = await CreateProjectAsync(client, 2010);

            var response = await client.GetAsync($"/api/projects/{project.PublicId}/services/srv-doesnotexist");

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task GetById_NonOwnerNonAdmin_Returns404()
        {
            var owner = CreateAuthenticatedClient(userId: 2011);
            var project = await CreateProjectAsync(owner, 2011);
            var created = await owner.PostAsJsonAsync(
                $"/api/projects/{project.PublicId}/services",
                ValidServiceRequest(UniqueName("api")));
            var createdBody = await created.Content.ReadFromJsonAsync<ApiResponse<ServiceResponse>>();

            var intruder = CreateAuthenticatedClient(userId: 9999);
            var response = await intruder.GetAsync(
                $"/api/projects/{project.PublicId}/services/{createdBody!.Data!.PublicId}");

            // The service hides existence behind a 404 rather than confirming it exists.
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task GetById_UnauthenticatedRequest_Returns401()
        {
            var client = _factory.CreateClient();

            var response = await client.GetAsync("/api/projects/prj-any/services/srv-any");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        // ---------- Update service ----------

        [Fact]
        public async Task Update_ValidRequest_PersistsChanges()
        {
            var client = CreateAuthenticatedClient(userId: 2012);
            var project = await CreateProjectAsync(client, 2012);
            var created = await client.PostAsJsonAsync(
                $"/api/projects/{project.PublicId}/services",
                ValidServiceRequest(UniqueName("api")));
            var createdBody = await created.Content.ReadFromJsonAsync<ApiResponse<ServiceResponse>>();
            var publicId = createdBody!.Data!.PublicId;

            var response = await client.PatchAsJsonAsync(
                $"/api/projects/{project.PublicId}/services/{publicId}",
                new UpdateServiceRequest { Provider = "podman", WorkflowFile = "ship.yml" });

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            // Confirm the change survived a round trip through the database.
            var reread = await client.GetAsync($"/api/projects/{project.PublicId}/services/{publicId}");
            var body = await reread.Content.ReadFromJsonAsync<ApiResponse<ServiceResponse>>();
            Assert.Equal("podman", body!.Data!.Provider);
            Assert.Equal("ship.yml", body.Data.WorkflowFile);
        }

        [Fact]
        public async Task Update_UnknownService_Returns404()
        {
            var client = CreateAuthenticatedClient(userId: 2013);
            var project = await CreateProjectAsync(client, 2013);

            var response = await client.PatchAsJsonAsync(
                $"/api/projects/{project.PublicId}/services/srv-doesnotexist",
                new UpdateServiceRequest { Provider = "docker" });

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }

        [Fact]
        public async Task Update_NonOwnerNonAdmin_Returns400()
        {
            var owner = CreateAuthenticatedClient(userId: 2014);
            var project = await CreateProjectAsync(owner, 2014);
            var created = await owner.PostAsJsonAsync(
                $"/api/projects/{project.PublicId}/services",
                ValidServiceRequest(UniqueName("api")));
            var createdBody = await created.Content.ReadFromJsonAsync<ApiResponse<ServiceResponse>>();

            var intruder = CreateAuthenticatedClient(userId: 9999);
            var response = await intruder.PatchAsJsonAsync(
                $"/api/projects/{project.PublicId}/services/{createdBody!.Data!.PublicId}",
                new UpdateServiceRequest { Provider = "docker" });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Update_UnauthenticatedRequest_Returns401()
        {
            var client = _factory.CreateClient();

            var response = await client.PatchAsJsonAsync(
                "/api/projects/prj-any/services/srv-any",
                new UpdateServiceRequest { Provider = "docker" });

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }

        // ---------- Delete service ----------

        [Fact]
        public async Task Delete_Owner_RemovesServiceFromProject()
        {
            var client = CreateAuthenticatedClient(userId: 2015);
            var project = await CreateProjectAsync(client, 2015);
            var created = await client.PostAsJsonAsync(
                $"/api/projects/{project.PublicId}/services",
                ValidServiceRequest(UniqueName("api")));
            var createdBody = await created.Content.ReadFromJsonAsync<ApiResponse<ServiceResponse>>();
            var publicId = createdBody!.Data!.PublicId;

            var response = await client.DeleteAsync($"/api/projects/{project.PublicId}/services/{publicId}");

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var list = await client.GetAsync($"/api/projects/{project.PublicId}/services");
            var body = await list.Content.ReadFromJsonAsync<ApiResponse<List<ServiceResponse>>>();
            Assert.DoesNotContain(body!.Data!, s => s.PublicId == publicId);
        }

        [Fact]
        public async Task Delete_UnknownService_Returns400()
        {
            var client = CreateAuthenticatedClient(userId: 2016);
            var project = await CreateProjectAsync(client, 2016);

            var response = await client.DeleteAsync($"/api/projects/{project.PublicId}/services/srv-doesnotexist");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        [Fact]
        public async Task Delete_NonOwnerNonAdmin_DoesNotRemoveService()
        {
            var owner = CreateAuthenticatedClient(userId: 2017);
            var project = await CreateProjectAsync(owner, 2017);
            var created = await owner.PostAsJsonAsync(
                $"/api/projects/{project.PublicId}/services",
                ValidServiceRequest(UniqueName("api")));
            var createdBody = await created.Content.ReadFromJsonAsync<ApiResponse<ServiceResponse>>();
            var publicId = createdBody!.Data!.PublicId;

            var intruder = CreateAuthenticatedClient(userId: 9999);
            var response = await intruder.DeleteAsync($"/api/projects/{project.PublicId}/services/{publicId}");

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            // The service must still be there for its real owner.
            var ownerList = await owner.GetAsync($"/api/projects/{project.PublicId}/services");
            var body = await ownerList.Content.ReadFromJsonAsync<ApiResponse<List<ServiceResponse>>>();
            Assert.Contains(body!.Data!, s => s.PublicId == publicId);
        }

        [Fact]
        public async Task Delete_UnauthenticatedRequest_Returns401()
        {
            var client = _factory.CreateClient();

            var response = await client.DeleteAsync("/api/projects/prj-any/services/srv-any");

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }
}
