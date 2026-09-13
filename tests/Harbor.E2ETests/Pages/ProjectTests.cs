using System;
using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using Harbor.E2ETests.Pages;

namespace Harbor.E2ETests.Tests
{
    [TestFixture]
    public class ProjectTests : BaseTest
    {
        private void LoginAsFreshUser()
        {
            var uniqueId = Guid.NewGuid().ToString("N").Substring(0, 8);
            var username = $"user_{uniqueId}";
            var email = $"user_{uniqueId}@example.com";
            var password = "ValidPassword123!";

            var createAccountPage = new CreateAccountPage(Driver);
            createAccountPage.NavigateTo();
            createAccountPage.CreateAccount(username, email, password);

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/dashboard"));
        }

        [Test]
        public void CreateProject_WithValidData_AppearsInProjectsList()
        {
            LoginAsFreshUser();

            var projectName = $"harbor-e2e-{Guid.NewGuid().ToString("N").Substring(0, 6)}";

            var createProjectPage = new CreateProjectPage(Driver);
            createProjectPage.NavigateTo();
            createProjectPage.FillForm(projectName, "Created by Selenium E2E test", "https://github.com/your-org/harbor-e2e");
            createProjectPage.Submit();

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            wait.Until(d => d.Url.Contains("/projects") && !d.Url.Contains("/new"));

            var projectsPage = new ProjectsPage(Driver);
            Assert.That(projectsPage.HasProjectNamed(projectName), Is.True);
        }

        [Test]
        public void CreateProject_WithEmptyName_ShowsInlineValidationError_AndDoesNotSubmit()
        {
            LoginAsFreshUser();

            var createProjectPage = new CreateProjectPage(Driver);
            createProjectPage.NavigateTo();
            createProjectPage.Submit();

            var error = createProjectPage.GetNameFieldError();
            Assert.That(error, Is.Not.Empty);
            Assert.That(Driver.Url, Does.Contain("/projects/new"));
        }

        [Test]
        public void EditProject_WithValidData_SavesAndReturnsToProjectsList()
        {
            LoginAsFreshUser();

            var projectName = $"harbor-e2e-edit-{Guid.NewGuid().ToString("N").Substring(0, 6)}";

            var createProjectPage = new CreateProjectPage(Driver);
            createProjectPage.NavigateTo();
            createProjectPage.FillForm(projectName, "Original description");
            createProjectPage.Submit();

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            wait.Until(d => d.Url.Contains("/projects") && !d.Url.Contains("/new"));

            var projectsPage = new ProjectsPage(Driver);
            projectsPage.ClickEditFor(projectName);
            wait.Until(d => d.Url.Contains("/edit"));

            var editPage = new EditProjectPage(Driver);
            editPage.Save();

            wait.Until(d => d.Url.Contains("/projects") && !d.Url.Contains("/edit"));
            Assert.That(Driver.Url, Does.Contain("/projects"));
        }

        [Test]
        public void ArchiveProject_RemovesItFromActiveList()
        {
            LoginAsFreshUser();

            var projectName = $"harbor-e2e-archive-{Guid.NewGuid().ToString("N").Substring(0, 6)}";

            var createProjectPage = new CreateProjectPage(Driver);
            createProjectPage.NavigateTo();
            createProjectPage.FillForm(projectName);
            createProjectPage.Submit();

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            wait.Until(d => d.Url.Contains("/projects") && !d.Url.Contains("/new"));

            var projectsPage = new ProjectsPage(Driver);
            projectsPage.ClickEditFor(projectName);
            wait.Until(d => d.Url.Contains("/edit"));

            var editPage = new EditProjectPage(Driver);
            editPage.Archive();

            wait.Until(d => d.Url.Contains("/projects") && !d.Url.Contains("/edit"));

            var updatedProjectsPage = new ProjectsPage(Driver);
            Assert.That(updatedProjectsPage.HasProjectNamed(projectName), Is.False);
        }

        [Test]
        public void CreateDevelopmentEnvironment_AppearsInProjectEnvironments()
        {
            LoginAsFreshUser();
            var projectName = $"harbor-e2e-env-{Guid.NewGuid().ToString("N").Substring(0, 6)}";
            var environmentName = "Development";

            var createProjectPage = new CreateProjectPage(Driver);
            createProjectPage.NavigateTo();
            createProjectPage.FillForm(projectName);
            createProjectPage.Submit();

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            wait.Until(d => d.Url.Contains("/projects") && !d.Url.Contains("/new"));
            var projectsPage = new ProjectsPage(Driver);
            projectsPage.ClickEnvironmentsFor(projectName);
            wait.Until(d => d.Url.Contains("/environments"));

            var environmentsPage = new ProjectEnvironmentsPage(Driver);
            environmentsPage.Create(environmentName, "Development");
            Assert.That(environmentsPage.HasEnvironment(environmentName, "Development"), Is.True);
        }

        // TC-US9-002: the create-environment dropdown only ever offers Development,
        // Staging and Production (see ProjectEnvironments.tsx), so this parameterized
        // case is the UI-level check that Staging and Production are each accepted,
        // matching the pattern DeploymentsTests uses for its own [TestCase] coverage.
        [TestCase("Staging")]
        [TestCase("Production")]
        public void CreateEnvironment_WithSupportedType_AppearsInProjectEnvironments(string type)
        {
            LoginAsFreshUser();
            var projectName = $"harbor-e2e-env-{Guid.NewGuid().ToString("N").Substring(0, 6)}";
            var environmentName = type;

            var createProjectPage = new CreateProjectPage(Driver);
            createProjectPage.NavigateTo();
            createProjectPage.FillForm(projectName);
            createProjectPage.Submit();

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            wait.Until(d => d.Url.Contains("/projects") && !d.Url.Contains("/new"));
            var projectsPage = new ProjectsPage(Driver);
            projectsPage.ClickEnvironmentsFor(projectName);
            wait.Until(d => d.Url.Contains("/environments"));

            var environmentsPage = new ProjectEnvironmentsPage(Driver);
            environmentsPage.Create(environmentName, type);
            Assert.That(environmentsPage.HasEnvironment(environmentName, type), Is.True);
        }

        // TC-US9-003: creates all three supported types against one project and
        // confirms the view lists every one of them together, not just the last created.
        [Test]
        public void ViewEnvironments_AfterCreatingAllThreeTypes_ListsAllOfThem()
        {
            LoginAsFreshUser();
            var projectName = $"harbor-e2e-env-{Guid.NewGuid().ToString("N").Substring(0, 6)}";

            var createProjectPage = new CreateProjectPage(Driver);
            createProjectPage.NavigateTo();
            createProjectPage.FillForm(projectName);
            createProjectPage.Submit();

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            wait.Until(d => d.Url.Contains("/projects") && !d.Url.Contains("/new"));
            var projectsPage = new ProjectsPage(Driver);
            projectsPage.ClickEnvironmentsFor(projectName);
            wait.Until(d => d.Url.Contains("/environments"));

            var environmentsPage = new ProjectEnvironmentsPage(Driver);
            environmentsPage.Create("Dev", "Development");
            environmentsPage.Create("Stage", "Staging");
            environmentsPage.Create("Prod", "Production");

            Assert.That(environmentsPage.HasEnvironment("Dev", "Development"), Is.True);
            Assert.That(environmentsPage.HasEnvironment("Stage", "Staging"), Is.True);
            Assert.That(environmentsPage.HasEnvironment("Prod", "Production"), Is.True);
        }
    }
}