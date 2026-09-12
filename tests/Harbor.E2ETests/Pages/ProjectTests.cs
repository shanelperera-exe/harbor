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

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
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
    }
}