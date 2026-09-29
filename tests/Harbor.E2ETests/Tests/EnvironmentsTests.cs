using System;
using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using Harbor.E2ETests.Pages;

namespace Harbor.E2ETests.Tests
{
    // Covers US10 (Update/delete deployment environments) AC1-AC3 at the UI level.
    // Each test registers a fresh user so environment state never leaks between runs.
    [TestFixture]
    public class EnvironmentsTests : BaseTest
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
            wait.Until(d => d.Url.Contains("/projects"));
        }

        private ProjectEnvironmentsPage CreateProjectAndOpenEnvironments(string projectName)
        {
            var createProjectPage = new CreateProjectPage(Driver);
            createProjectPage.NavigateTo();
            createProjectPage.FillForm(projectName);
            createProjectPage.Submit();

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            wait.Until(d => d.Url.Contains("/projects") && !d.Url.Contains("/new"));

            var projectsPage = new ProjectsPage(Driver);
            projectsPage.ClickEnvironmentsFor(projectName);
            wait.Until(d => d.Url.Contains("/environments"));

            return new ProjectEnvironmentsPage(Driver);
        }

        // Names deliberately don't share a substring (unlike e.g. "Staging" -> "QA Staging"),
        // because HasEnvironment() matches on the environment's data-env-name, and a renamed
        // card's text would otherwise still satisfy a check for the old name, masking a real
        // regression here.
        //
        // Editing an environment is no longer an inline card interaction - the environments
        // list only offers a Settings link, and the rename form lives on that page.
        [Test]
        public void EditEnvironment_WithValidData_UpdatesCardInPlace()
        {
            LoginAsFreshUser();
            var projectName = $"harbor-e2e-edit-{Guid.NewGuid().ToString("N").Substring(0, 6)}";

            var environmentsPage = CreateProjectAndOpenEnvironments(projectName);
            environmentsPage.Create("OriginalEnv", "Staging");
            Assert.That(environmentsPage.HasEnvironment("OriginalEnv", "Staging"), Is.True);

            environmentsPage.OpenSettings("OriginalEnv");
            var settingsPage = new EnvironmentSettingsPage(Driver);
            settingsPage.RenameTo("RenamedEnv");

            Assert.That(settingsPage.GetName(), Is.EqualTo("RenamedEnv"));

            // Renaming does not navigate, so go back to the list explicitly and confirm the
            // section reflects the new name and no longer answers to the old one.
            Driver.Navigate().Back();
            var updatedEnvironmentsPage = new ProjectEnvironmentsPage(Driver);
            updatedEnvironmentsPage.NavigateBackToEnvironments();

            Assert.That(updatedEnvironmentsPage.HasEnvironment("RenamedEnv", "Staging"), Is.True);
            Assert.That(updatedEnvironmentsPage.HasEnvironment("OriginalEnv", "Staging"), Is.False);
        }

        [Test]
        public void RemoveEnvironment_WithNoDeploymentHistory_RemovesCardWithNoNotice()
        {
            LoginAsFreshUser();
            var projectName = $"harbor-e2e-remove-{Guid.NewGuid().ToString("N").Substring(0, 6)}";

            var environmentsPage = CreateProjectAndOpenEnvironments(projectName);
            environmentsPage.Create("Development", "Development");
            Assert.That(environmentsPage.HasEnvironment("Development", "Development"), Is.True);

            environmentsPage.OpenSettings("Development");
            new EnvironmentSettingsPage(Driver).Delete();

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/environments") && !d.Url.Contains("/settings"));

            Assert.That(environmentsPage.HasEnvironment("Development", "Development"), Is.False);
        }

        // Note: this test only exercises the "no history" removal path via the UI, since
        // seeding a Deployments row (to trigger the deactivate-instead-of-delete path)
        // requires direct DB access that isn't available to a freshly registered E2E user.
        // The deactivation + notice-message path (blue, not red - see BUG-US10-001) is
        // covered manually per TC-US10-017 in the QA Test Case Register.
    }
}