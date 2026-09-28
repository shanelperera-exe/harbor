using Harbor.Project.DTOs;
using Harbor.Project.Models;
using Harbor.Project.Repositories;
using Harbor.Project.Services;
using Moq;
using Xunit;

namespace Harbor.Project.Tests
{
    public class ServiceServiceTests
    {
        private readonly Mock<IServiceRepository> _serviceRepository = new();
        private readonly Mock<IProjectRepository> _projectRepository = new();
        private readonly ServiceService _service;

        private const int OwnerId = 7;

        public ServiceServiceTests()
        {
            _service = new ServiceService(_serviceRepository.Object, _projectRepository.Object);
        }

        private void SetupProject(ProjectEntity? project)
        {
            _projectRepository
                .Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>()))
                .ReturnsAsync(project);
        }

        private void SetupProjectById(ProjectEntity? project)
        {
            _projectRepository
                .Setup(r => r.GetByIdAsync(It.IsAny<int>()))
                .ReturnsAsync(project);
        }

        private static ProjectEntity OwnedProject(int id = 10) => new()
        {
            Id = id,
            PublicId = "prj-abcdefghij",
            Name = "harbor-web",
            OwnerId = OwnerId,
            IsArchived = false
        };

        private static ServiceEntity ExistingService(int id = 13) => new()
        {
            Id = id,
            PublicId = "srv-abcdefghij",
            ProjectId = 10,
            Name = "api",
            Type = "Backend",
            CreatedAt = DateTime.UtcNow
        };

        // ---------- CreateAsync: success paths ----------

        [Fact]
        public async Task CreateAsync_ValidRequest_PersistsTrimmedService()
        {
            SetupProject(OwnedProject());
            _serviceRepository.Setup(r => r.CreateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(13);
            _serviceRepository.Setup(r => r.GetByIdAsync(13)).ReturnsAsync(ExistingService());

            var request = new CreateServiceRequest
            {
                Name = "  api  ",
                Type = "  Backend  ",
                RepositoryUrl = "  https://github.com/acme/api  ",
                RepositoryName = "  acme/api  ",
                RepositoryBranch = "  main  ",
                WorkflowFile = "  ship.yml  ",
                Provider = "  docker  ",
                IsPrivate = true
            };

            var (success, error, data) = await _service.CreateAsync("prj-abcdefghij", request, OwnerId, isAdmin: false);

            Assert.True(success);
            Assert.Null(error);
            Assert.NotNull(data);

            _serviceRepository.Verify(r => r.CreateAsync(It.Is<ServiceEntity>(s =>
                s.ProjectId == 10 &&
                s.Name == "api" &&
                s.Type == "Backend" &&
                s.RepositoryUrl == "https://github.com/acme/api" &&
                s.RepositoryName == "acme/api" &&
                s.RepositoryBranch == "main" &&
                s.WorkflowFile == "ship.yml" &&
                s.Provider == "docker" &&
                s.IsPrivate)), Times.Once);
        }

        [Fact]
        public async Task CreateAsync_GeneratesPublicIdWithServicePrefix()
        {
            SetupProject(OwnedProject());
            _serviceRepository.Setup(r => r.CreateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(13);
            _serviceRepository.Setup(r => r.GetByIdAsync(13)).ReturnsAsync(ExistingService());

            await _service.CreateAsync("prj-abcdefghij", new CreateServiceRequest { Name = "api", Type = "Backend" }, OwnerId, isAdmin: false);

            _serviceRepository.Verify(r => r.CreateAsync(It.Is<ServiceEntity>(s => s.PublicId.StartsWith("srv-"))), Times.Once);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public async Task CreateAsync_BlankWorkflowFile_DefaultsToDeployYml(string? workflowFile)
        {
            SetupProject(OwnedProject());
            _serviceRepository.Setup(r => r.CreateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(13);
            _serviceRepository.Setup(r => r.GetByIdAsync(13)).ReturnsAsync(ExistingService());

            await _service.CreateAsync(
                "prj-abcdefghij",
                new CreateServiceRequest { Name = "api", Type = "Backend", WorkflowFile = workflowFile },
                OwnerId,
                isAdmin: false);

            _serviceRepository.Verify(r => r.CreateAsync(It.Is<ServiceEntity>(s => s.WorkflowFile == "deploy.yml")), Times.Once);
        }

        [Fact]
        public async Task CreateAsync_AdminCanAddServiceToAnotherUsersProject()
        {
            SetupProject(OwnedProject());
            _serviceRepository.Setup(r => r.CreateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(13);
            _serviceRepository.Setup(r => r.GetByIdAsync(13)).ReturnsAsync(ExistingService());

            var (success, error, _) = await _service.CreateAsync(
                "prj-abcdefghij",
                new CreateServiceRequest { Name = "api", Type = "Backend" },
                userId: 99,
                isAdmin: true);

            Assert.True(success);
            Assert.Null(error);
        }

        // ---------- CreateAsync: validation failures ----------

        [Fact]
        public async Task CreateAsync_ProjectNotFound_ReturnsError()
        {
            SetupProject(null);

            var (success, error, data) = await _service.CreateAsync(
                "prj-missing", new CreateServiceRequest { Name = "api", Type = "Backend" }, OwnerId, isAdmin: false);

            Assert.False(success);
            Assert.Equal("Project not found.", error);
            Assert.Null(data);
            _serviceRepository.Verify(r => r.CreateAsync(It.IsAny<ServiceEntity>()), Times.Never);
        }

        [Fact]
        public async Task CreateAsync_ArchivedProject_ReturnsError()
        {
            var archived = OwnedProject();
            archived.IsArchived = true;
            SetupProject(archived);

            var (success, error, _) = await _service.CreateAsync(
                "prj-abcdefghij", new CreateServiceRequest { Name = "api", Type = "Backend" }, OwnerId, isAdmin: false);

            Assert.False(success);
            Assert.Equal("Cannot add services to an archived project.", error);
            _serviceRepository.Verify(r => r.CreateAsync(It.IsAny<ServiceEntity>()), Times.Never);
        }

        [Fact]
        public async Task CreateAsync_NonOwnerNonAdmin_ReturnsPermissionError()
        {
            SetupProject(OwnedProject());

            var (success, error, _) = await _service.CreateAsync(
                "prj-abcdefghij", new CreateServiceRequest { Name = "api", Type = "Backend" }, userId: 99, isAdmin: false);

            Assert.False(success);
            Assert.Equal("You do not have permission to add services to this project.", error);
            _serviceRepository.Verify(r => r.CreateAsync(It.IsAny<ServiceEntity>()), Times.Never);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public async Task CreateAsync_BlankName_ReturnsError(string? name)
        {
            SetupProject(OwnedProject());

            var (success, error, _) = await _service.CreateAsync(
                "prj-abcdefghij", new CreateServiceRequest { Name = name!, Type = "Backend" }, OwnerId, isAdmin: false);

            Assert.False(success);
            Assert.Equal("Service name is required.", error);
            _serviceRepository.Verify(r => r.CreateAsync(It.IsAny<ServiceEntity>()), Times.Never);
        }

        [Theory]
        [InlineData(null)]
        [InlineData("")]
        [InlineData("   ")]
        public async Task CreateAsync_BlankType_ReturnsError(string? type)
        {
            SetupProject(OwnedProject());

            var (success, error, _) = await _service.CreateAsync(
                "prj-abcdefghij", new CreateServiceRequest { Name = "api", Type = type! }, OwnerId, isAdmin: false);

            Assert.False(success);
            Assert.Equal("Service type is required.", error);
            _serviceRepository.Verify(r => r.CreateAsync(It.IsAny<ServiceEntity>()), Times.Never);
        }

        [Fact]
        public async Task CreateAsync_RepositoryUrlWithoutBranchOrCommit_ReturnsError()
        {
            SetupProject(OwnedProject());

            var (success, error, _) = await _service.CreateAsync(
                "prj-abcdefghij",
                new CreateServiceRequest { Name = "api", Type = "Backend", RepositoryUrl = "https://github.com/acme/api" },
                OwnerId,
                isAdmin: false);

            Assert.False(success);
            Assert.Equal("A version reference (branch or commit) is required for deployed services.", error);
            _serviceRepository.Verify(r => r.CreateAsync(It.IsAny<ServiceEntity>()), Times.Never);
        }

        [Fact]
        public async Task CreateAsync_RepositoryUrlWithCommitOnly_IsAccepted()
        {
            SetupProject(OwnedProject());
            _serviceRepository.Setup(r => r.CreateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(13);
            _serviceRepository.Setup(r => r.GetByIdAsync(13)).ReturnsAsync(ExistingService());

            var (success, error, _) = await _service.CreateAsync(
                "prj-abcdefghij",
                new CreateServiceRequest
                {
                    Name = "api",
                    Type = "Backend",
                    RepositoryUrl = "https://github.com/acme/api",
                    RepositoryCommit = "  abc123  "
                },
                OwnerId,
                isAdmin: false);

            Assert.True(success);
            Assert.Null(error);
            _serviceRepository.Verify(r => r.CreateAsync(It.Is<ServiceEntity>(s => s.RepositoryCommit == "abc123")), Times.Once);
        }

        [Fact]
        public async Task CreateAsync_NoRepositoryUrl_DoesNotRequireVersionReference()
        {
            SetupProject(OwnedProject());
            _serviceRepository.Setup(r => r.CreateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(13);
            _serviceRepository.Setup(r => r.GetByIdAsync(13)).ReturnsAsync(ExistingService());

            var (success, error, _) = await _service.CreateAsync(
                "prj-abcdefghij", new CreateServiceRequest { Name = "library", Type = "Backend" }, OwnerId, isAdmin: false);

            Assert.True(success);
            Assert.Null(error);
        }

        // ---------- CreateAsync: deployment url persistence ----------

        [Fact]
        public async Task CreateAsync_DeploymentUrlsList_IsSerialisedToJson()
        {
            SetupProject(OwnedProject());
            _serviceRepository.Setup(r => r.CreateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(13);
            _serviceRepository.Setup(r => r.GetByIdAsync(13)).ReturnsAsync(ExistingService());

            await _service.CreateAsync(
                "prj-abcdefghij",
                new CreateServiceRequest
                {
                    Name = "api",
                    Type = "Backend",
                    DeploymentUrls = new List<ServiceDeploymentUrl>
                    {
                        new() { Environment = "Staging", Url = "https://staging.acme.dev" }
                    }
                },
                OwnerId,
                isAdmin: false);

            _serviceRepository.Verify(r => r.CreateAsync(It.Is<ServiceEntity>(s =>
                s.DeploymentUrl != null && s.DeploymentUrl.Contains("staging.acme.dev"))), Times.Once);
        }

        [Fact]
        public async Task CreateAsync_SingleDeploymentUrl_IsStoredAsIs()
        {
            SetupProject(OwnedProject());
            _serviceRepository.Setup(r => r.CreateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(13);
            _serviceRepository.Setup(r => r.GetByIdAsync(13)).ReturnsAsync(ExistingService());

            await _service.CreateAsync(
                "prj-abcdefghij",
                new CreateServiceRequest { Name = "api", Type = "Backend", DeploymentUrl = "  https://acme.dev  " },
                OwnerId,
                isAdmin: false);

            _serviceRepository.Verify(r => r.CreateAsync(It.Is<ServiceEntity>(s => s.DeploymentUrl == "https://acme.dev")), Times.Once);
        }

        // ---------- GetByProjectIdAsync ----------

        [Fact]
        public async Task GetByProjectIdAsync_Owner_ReturnsAllProjectServices()
        {
            SetupProject(OwnedProject());
            _serviceRepository.Setup(r => r.GetByProjectIdAsync(10)).ReturnsAsync(new List<ServiceEntity>
            {
                ExistingService(13),
                new() { Id = 14, PublicId = "srv-klmnopqrst", ProjectId = 10, Name = "web", Type = "Frontend" }
            });

            var (success, error, data) = await _service.GetByProjectIdAsync("prj-abcdefghij", OwnerId, isAdmin: false);

            Assert.True(success);
            Assert.Null(error);
            Assert.Equal(2, data!.Count);
            Assert.Equal("api", data[0].Name);
            _serviceRepository.Verify(r => r.GetByProjectIdAsync(10), Times.Once);
        }

        [Fact]
        public async Task GetByProjectIdAsync_ProjectNotFound_ReturnsError()
        {
            SetupProject(null);

            var (success, error, data) = await _service.GetByProjectIdAsync("prj-missing", OwnerId, isAdmin: false);

            Assert.False(success);
            Assert.Equal("Project not found.", error);
            Assert.Null(data);
        }

        [Fact]
        public async Task GetByProjectIdAsync_NonOwnerNonAdmin_ReturnsPermissionError()
        {
            SetupProject(OwnedProject());

            var (success, error, _) = await _service.GetByProjectIdAsync("prj-abcdefghij", userId: 99, isAdmin: false);

            Assert.False(success);
            Assert.Equal("You do not have permission to view this project's services.", error);
            _serviceRepository.Verify(r => r.GetByProjectIdAsync(It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task GetByProjectIdAsync_ArchivedProject_IsStillReadableByOwner()
        {
            var archived = OwnedProject();
            archived.IsArchived = true;
            SetupProject(archived);
            _serviceRepository.Setup(r => r.GetByProjectIdAsync(10)).ReturnsAsync(new List<ServiceEntity>());

            var (success, error, _) = await _service.GetByProjectIdAsync("prj-abcdefghij", OwnerId, isAdmin: false);

            Assert.True(success);
            Assert.Null(error);
        }

        // ---------- GetByIdAsync ----------

        [Fact]
        public async Task GetByIdAsync_Owner_ReturnsService()
        {
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync("srv-abcdefghij")).ReturnsAsync(ExistingService());
            SetupProjectById(OwnedProject());

            var (success, error, data) = await _service.GetByIdAsync("srv-abcdefghij", OwnerId, isAdmin: false);

            Assert.True(success);
            Assert.Null(error);
            Assert.Equal(13, data!.Id);
            Assert.Equal("srv-abcdefghij", data.PublicId);
        }

        [Fact]
        public async Task GetByIdAsync_ServiceNotFound_ReturnsError()
        {
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync((ServiceEntity?)null);

            var (success, error, data) = await _service.GetByIdAsync("srv-missing", OwnerId, isAdmin: false);

            Assert.False(success);
            Assert.Equal("Service not found.", error);
            Assert.Null(data);
        }

        [Fact]
        public async Task GetByIdAsync_OwningProjectMissing_ReturnsError()
        {
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(ExistingService());
            SetupProjectById(null);

            var (success, error, _) = await _service.GetByIdAsync("srv-abcdefghij", OwnerId, isAdmin: false);

            Assert.False(success);
            Assert.Equal("Project not found.", error);
        }

        [Fact]
        public async Task GetByIdAsync_NonOwnerNonAdmin_ReturnsPermissionError()
        {
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(ExistingService());
            SetupProjectById(OwnedProject());

            var (success, error, _) = await _service.GetByIdAsync("srv-abcdefghij", userId: 99, isAdmin: false);

            Assert.False(success);
            Assert.Equal("You do not have permission to view this service.", error);
        }

        // ---------- DeleteAsync ----------

        [Fact]
        public async Task DeleteAsync_Owner_DeletesService()
        {
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync("srv-abcdefghij")).ReturnsAsync(ExistingService());
            SetupProjectById(OwnedProject());
            _serviceRepository.Setup(r => r.DeleteAsync(13)).ReturnsAsync(true);

            var (success, error) = await _service.DeleteAsync("srv-abcdefghij", OwnerId, isAdmin: false);

            Assert.True(success);
            Assert.Null(error);
            _serviceRepository.Verify(r => r.DeleteAsync(13), Times.Once);
        }

        [Fact]
        public async Task DeleteAsync_ServiceNotFound_ReturnsError()
        {
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync((ServiceEntity?)null);

            var (success, error) = await _service.DeleteAsync("srv-missing", OwnerId, isAdmin: false);

            Assert.False(success);
            Assert.Equal("Service not found.", error);
            _serviceRepository.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task DeleteAsync_OwningProjectMissing_ReturnsError()
        {
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(ExistingService());
            SetupProjectById(null);

            var (success, error) = await _service.DeleteAsync("srv-abcdefghij", OwnerId, isAdmin: false);

            Assert.False(success);
            Assert.Equal("Project not found.", error);
        }

        [Fact]
        public async Task DeleteAsync_NonOwnerNonAdmin_ReturnsPermissionError()
        {
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(ExistingService());
            SetupProjectById(OwnedProject());

            var (success, error) = await _service.DeleteAsync("srv-abcdefghij", userId: 99, isAdmin: false);

            Assert.False(success);
            Assert.Equal("You do not have permission to delete this service.", error);
            _serviceRepository.Verify(r => r.DeleteAsync(It.IsAny<int>()), Times.Never);
        }

        [Fact]
        public async Task DeleteAsync_RepositoryReportsFailure_ReturnsError()
        {
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(ExistingService());
            SetupProjectById(OwnedProject());
            _serviceRepository.Setup(r => r.DeleteAsync(13)).ReturnsAsync(false);

            var (success, error) = await _service.DeleteAsync("srv-abcdefghij", OwnerId, isAdmin: false);

            Assert.False(success);
            Assert.Equal("Failed to delete service.", error);
        }

        // ---------- UpdateAsync ----------

        [Fact]
        public async Task UpdateAsync_ValidRequest_PersistsChangedFields()
        {
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(ExistingService());
            SetupProjectById(OwnedProject());
            _serviceRepository.Setup(r => r.UpdateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(true);
            _serviceRepository.Setup(r => r.GetByIdAsync(13)).ReturnsAsync(ExistingService());

            var (success, error, _) = await _service.UpdateAsync(
                "srv-abcdefghij",
                new UpdateServiceRequest { WorkflowFile = "  ship.yml  ", BuildCommand = "  dotnet build  ", StartCommand = "  dotnet run  ", Provider = "  docker  " },
                OwnerId,
                isAdmin: false);

            Assert.True(success);
            Assert.Null(error);

            _serviceRepository.Verify(r => r.UpdateAsync(It.Is<ServiceEntity>(s =>
                s.WorkflowFile == "ship.yml" &&
                s.BuildCommand == "dotnet build" &&
                s.StartCommand == "dotnet run" &&
                s.Provider == "docker")), Times.Once);
        }

        [Fact]
        public async Task UpdateAsync_NullFields_AreLeftUnchanged()
        {
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(ExistingService());
            SetupProjectById(OwnedProject());
            _serviceRepository.Setup(r => r.UpdateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(true);
            _serviceRepository.Setup(r => r.GetByIdAsync(13)).ReturnsAsync(ExistingService());

            var (success, _, _) = await _service.UpdateAsync(
                "srv-abcdefghij",
                new UpdateServiceRequest { Provider = "  podman  " },
                OwnerId,
                isAdmin: false);

            Assert.True(success);
            _serviceRepository.Verify(r => r.UpdateAsync(It.Is<ServiceEntity>(s =>
                s.WorkflowFile == null && s.BuildCommand == null && s.StartCommand == null && s.Provider == "podman")), Times.Once);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
        public async Task UpdateAsync_BlankWorkflowFile_ResetsToDeployYml(string blank)
        {
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(ExistingService());
            SetupProjectById(OwnedProject());
            _serviceRepository.Setup(r => r.UpdateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(true);
            _serviceRepository.Setup(r => r.GetByIdAsync(13)).ReturnsAsync(ExistingService());

            await _service.UpdateAsync(
                "srv-abcdefghij", new UpdateServiceRequest { WorkflowFile = blank }, OwnerId, isAdmin: false);

            _serviceRepository.Verify(r => r.UpdateAsync(It.Is<ServiceEntity>(s => s.WorkflowFile == "deploy.yml")), Times.Once);
        }

        [Theory]
        [InlineData("")]
        [InlineData("   ")]
    public async Task UpdateAsync_BlankOptionalCommand_ClearsStoredValue(string blank)
        {
        _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(ExistingService());
            SetupProjectById(OwnedProject());
            _serviceRepository.Setup(r => r.UpdateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(true);
            _serviceRepository.Setup(r => r.GetByIdAsync(13)).ReturnsAsync(ExistingService());

            await _service.UpdateAsync(
       "srv-abcdefghij", new UpdateServiceRequest { BuildCommand = blank, StartCommand = blank }, OwnerId, isAdmin: false);

            _serviceRepository.Verify(r => r.UpdateAsync(It.Is<ServiceEntity>(s => s.BuildCommand == null && s.StartCommand == null)), Times.Once);
        }

        [Fact]
        public async Task UpdateAsync_DeploymentUrlsList_TakesPrecedenceOverSingleUrl()
        {
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(ExistingService());
      SetupProjectById(OwnedProject());
            _serviceRepository.Setup(r => r.UpdateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(true);
            _serviceRepository.Setup(r => r.GetByIdAsync(13)).ReturnsAsync(ExistingService());

            await _service.UpdateAsync(
    "srv-abcdefghij",
          new UpdateServiceRequest
       {
           DeploymentUrl = "https://ignored.dev",
       DeploymentUrls = new List<ServiceDeploymentUrl> { new() { Environment = "Production", Url = "https://acme.dev" } }
     },
     OwnerId,
   isAdmin: false);

            // The list is serialised as JSON and takes precedence over the single URL.
            _serviceRepository.Verify(r => r.UpdateAsync(It.Is<ServiceEntity>(s =>
                s.DeploymentUrl != null &&
                s.DeploymentUrl.StartsWith("[") &&
                s.DeploymentUrl.Contains("https://acme.dev"))), Times.Once);
        }

        [Fact]
        public async Task UpdateAsync_BlankSingleUrl_ClearsStoredValue()
        {
  _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(ExistingService());
SetupProjectById(OwnedProject());
            _serviceRepository.Setup(r => r.UpdateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(true);
        _serviceRepository.Setup(r => r.GetByIdAsync(13)).ReturnsAsync(ExistingService());

      await _service.UpdateAsync(
    "srv-abcdefghij", new UpdateServiceRequest { DeploymentUrl = "   " }, OwnerId, isAdmin: false);

            _serviceRepository.Verify(r => r.UpdateAsync(It.Is<ServiceEntity>(s => s.DeploymentUrl == null)), Times.Once);
        }

        [Fact]
        public async Task UpdateAsync_ServiceNotFound_ReturnsError()
        {
  _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync((ServiceEntity?)null);

    var (success, error, data) = await _service.UpdateAsync(
      "srv-missing", new UpdateServiceRequest { Provider = "docker" }, OwnerId, isAdmin: false);

       Assert.False(success);
            Assert.Equal("Service not found.", error);
  Assert.Null(data);
        }

        [Fact]
        public async Task UpdateAsync_OwningProjectMissing_ReturnsError()
    {
  _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(ExistingService());
  SetupProjectById(null);

      var (success, error, _) = await _service.UpdateAsync(
       "srv-abcdefghij", new UpdateServiceRequest { Provider = "docker" }, OwnerId, isAdmin: false);

            Assert.False(success);
      Assert.Equal("Project not found.", error);
        }

        [Fact]
        public async Task UpdateAsync_NonOwnerNonAdmin_ReturnsPermissionError()
        {
      _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(ExistingService());
       SetupProjectById(OwnedProject());

  var (success, error, _) = await _service.UpdateAsync(
                "srv-abcdefghij", new UpdateServiceRequest { Provider = "docker" }, userId: 99, isAdmin: false);

            Assert.False(success);
      Assert.Equal("You do not have permission to update this service.", error);
            _serviceRepository.Verify(r => r.UpdateAsync(It.IsAny<ServiceEntity>()), Times.Never);
        }

 [Fact]
        public async Task UpdateAsync_RepositoryReportsFailure_ReturnsError()
 {
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(ExistingService());
    SetupProjectById(OwnedProject());
        _serviceRepository.Setup(r => r.UpdateAsync(It.IsAny<ServiceEntity>())).ReturnsAsync(false);

    var (success, error, data) = await _service.UpdateAsync(
            "srv-abcdefghij", new UpdateServiceRequest { Provider = "docker" }, OwnerId, isAdmin: false);

   Assert.False(success);
        Assert.Equal("Failed to update service.", error);
          Assert.Null(data);
        }

        // ---------- Response mapping (ToResponse) ----------

        [Fact]
        public async Task GetByIdAsync_JsonDeploymentUrlList_IsExpandedAndPrimaryUrlSetToFirst()
        {
            var service = ExistingService();
            service.DeploymentUrl = "[{\"Environment\":\"Staging\",\"Url\":\"https://staging.acme.dev\"},{\"Environment\":\"Production\",\"Url\":\"https://acme.dev\"}]";
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(service);
            SetupProjectById(OwnedProject());

            var (_, _, data) = await _service.GetByIdAsync("srv-abcdefghij", OwnerId, isAdmin: false);

            Assert.Equal(2, data!.DeploymentUrls!.Count);
            Assert.Equal("Staging", data.DeploymentUrls[0].Environment);
            // The first entry in the list wins as the primary URL for backward compatibility.
            Assert.Equal("https://staging.acme.dev", data.DeploymentUrl);
        }

        [Fact]
        public async Task GetByIdAsync_PlainDeploymentUrl_IsWrappedAsProductionEntry()
   {
   var service = ExistingService();
     service.DeploymentUrl = "https://acme.dev";
    _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(service);
            SetupProjectById(OwnedProject());

     var (_, _, data) = await _service.GetByIdAsync("srv-abcdefghij", OwnerId, isAdmin: false);

    var entry = Assert.Single(data!.DeploymentUrls!);
    Assert.Equal("Production", entry.Environment);
            Assert.Equal("https://acme.dev", entry.Url);
    Assert.Equal("https://acme.dev", data.DeploymentUrl);
        }

        [Fact]
        public async Task GetByIdAsync_MalformedJsonDeploymentUrl_FallsBackToProductionEntry()
   {
            var service = ExistingService();
         service.DeploymentUrl = "[ not valid json";
      _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(service);
      SetupProjectById(OwnedProject());

            var (_, _, data) = await _service.GetByIdAsync("srv-abcdefghij", OwnerId, isAdmin: false);

       var entry = Assert.Single(data!.DeploymentUrls!);
  Assert.Equal("Production", entry.Environment);
Assert.Equal("[ not valid json", entry.Url);
   }

        [Fact]
        public async Task GetByIdAsync_NoDeploymentUrl_YieldsEmptyUrlList()
        {
    var service = ExistingService();
  service.DeploymentUrl = null;
  _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(service);
    SetupProjectById(OwnedProject());

            var (_, _, data) = await _service.GetByIdAsync("srv-abcdefghij", OwnerId, isAdmin: false);

   Assert.Empty(data!.DeploymentUrls!);
            Assert.Null(data.DeploymentUrl);
   }

        [Fact]
        public async Task GetByIdAsync_EmptyPublicId_FallsBackToNumericId()
  {
        var service = ExistingService();
       service.PublicId = string.Empty;
            _serviceRepository.Setup(r => r.GetByIdOrPublicIdAsync(It.IsAny<string>())).ReturnsAsync(service);
   SetupProjectById(OwnedProject());

   var (_, _, data) = await _service.GetByIdAsync("13", OwnerId, isAdmin: false);

   Assert.Equal("13", data!.PublicId);
        }
    }
}
