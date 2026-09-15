using System;
using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using Harbor.E2ETests.Pages;

namespace Harbor.E2ETests.Tests
{
    // Covers US-11 (Configure environment) AC1-AC3 at the UI level.
    //
    // AC1 - Configure environment:        valid deployment configuration is saved and persists.
    // AC2 - Validate required config:     incomplete/invalid configuration is rejected with feedback.
    // AC3 - Protect sensitive values:     stored secure values are never handed back to the browser.
    //
    // Each test registers a fresh user and creates its own project + environment, so no state
    // leaks between runs and the tests can run in any order.
    [TestFixture]
    public class EnvironmentConfigurationTests : BaseTest
    {
        private const string ValidUrl = "https://api.staging.harbor.example.com";
        private const string ValidProvider = "AWS";

        private void LoginAsFreshUser()
        {
            var uniqueId = Guid.NewGuid().ToString("N").Substring(0, 8);

            var createAccountPage = new CreateAccountPage(Driver);
            createAccountPage.NavigateTo();
            createAccountPage.CreateAccount(
                $"user_{uniqueId}",
                $"user_{uniqueId}@example.com",
                "ValidPassword123!");

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/dashboard"));
        }

        private ProjectEnvironmentsPage CreateProjectAndOpenEnvironments(string projectName)
        {
            var createProjectPage = new CreateProjectPage(Driver);
            createProjectPage.NavigateTo();
            createProjectPage.FillForm(projectName);
            createProjectPage.Submit();

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects") && !d.Url.Contains("/new"));

            var projectsPage = new ProjectsPage(Driver);
            projectsPage.ClickEnvironmentsFor(projectName);
            wait.Until(d => d.Url.Contains("/environments"));

            return new ProjectEnvironmentsPage(Driver);
        }

        /// <summary>Registers a user, creates a project + one environment, and opens its configuration screen.</summary>
        private (ProjectEnvironmentsPage environments, EnvironmentConfigurationPage configuration, string environmentName)
            OpenConfigurationForNewEnvironment(string slug)
        {
            LoginAsFreshUser();

            var suffix = Guid.NewGuid().ToString("N").Substring(0, 6);
            var projectName = $"harbor-e2e-{slug}-{suffix}";
            const string environmentName = "Staging";

            var environmentsPage = CreateProjectAndOpenEnvironments(projectName);
            environmentsPage.Create(environmentName, "Staging");

            environmentsPage.OpenConfiguration(environmentName);

            var configurationPage = new EnvironmentConfigurationPage(Driver);
            configurationPage.WaitUntilLoaded();

            return (environmentsPage, configurationPage, environmentName);
        }

        // ------------------------------------------------------------------
        // AC1 - Configure environment
        // ------------------------------------------------------------------

        [Test]
        public void ConfigureEnvironment_WithValidConfiguration_SavesAndPersistsAfterReload()
        {
            var (_, configuration, _) = OpenConfigurationForNewEnvironment("cfg-valid");

            configuration.SetDeploymentUrl(ValidUrl);
            configuration.SetProvider(ValidProvider);
            configuration.SetConfigurationItem(0, "REGION", "eu-west-1");
            configuration.SetSecureValue(0, "API_KEY", "super-secret-value-001");

            configuration.SaveAndWait();

            Assert.That(configuration.WaitForNotice(), Is.True, "Expected a save confirmation.");
            Assert.That(configuration.GetNotice(), Does.Contain("Configuration saved"));
            Assert.That(configuration.HasError(), Is.False);

            // Reload to prove the values came back from the server, not from React state.
            configuration.Reload();

            Assert.Multiple(() =>
            {
                Assert.That(configuration.GetDeploymentUrl(), Is.EqualTo(ValidUrl));
                Assert.That(configuration.GetProvider(), Is.EqualTo(ValidProvider));
                Assert.That(configuration.GetConfigurationKey(0), Is.EqualTo("REGION"));
                Assert.That(configuration.GetConfigurationValue(0), Is.EqualTo("eu-west-1"));
                Assert.That(configuration.GetSecureValueKey(0), Is.EqualTo("API_KEY"));
            });
        }

        [Test]
        public void ConfigureEnvironment_AfterSaving_ShowsDeploymentSummaryOnEnvironmentCard()
        {
            var (environments, configuration, environmentName) =
                OpenConfigurationForNewEnvironment("cfg-summary");

            configuration.SetDeploymentUrl(ValidUrl);
            configuration.SetProvider(ValidProvider);
            configuration.SaveAndWait();

            Assert.That(configuration.WaitForNotice(), Is.True);

            Driver.Navigate().Back();

            var wait = new OpenQA.Selenium.Support.UI.WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => !environments.GetCardText(environmentName).Contains("Not configured yet"));

            var cardText = environments.GetCardText(environmentName);

            Assert.Multiple(() =>
            {
                Assert.That(cardText, Does.Contain(ValidUrl));
                Assert.That(cardText, Does.Contain(ValidProvider));
                Assert.That(cardText, Does.Not.Contain("Not configured yet"));
            });
        }

        // ------------------------------------------------------------------
        // AC2 - Validate required configuration
        // ------------------------------------------------------------------

        [Test]
        public void SaveConfiguration_WithBlankDeploymentUrl_IsRejectedWithFieldValidation()
        {
            var (_, configuration, _) = OpenConfigurationForNewEnvironment("cfg-no-url");

            configuration.SetDeploymentUrl(string.Empty);
            configuration.SetProvider(ValidProvider);

            configuration.Save();

            Assert.Multiple(() =>
            {
                Assert.That(
                    configuration.GetDeploymentUrlValidationMessage(),
                    Is.Not.Empty,
                    "Deployment URL is mandatory, so the browser should block the submit.");
                Assert.That(configuration.HasNotice(), Is.False, "Nothing should have been saved.");
            });
        }

        [Test]
        public void SaveConfiguration_WithBlankProvider_IsRejectedWithFieldValidation()
        {
            var (_, configuration, _) = OpenConfigurationForNewEnvironment("cfg-no-provider");

            configuration.SetDeploymentUrl(ValidUrl);
            configuration.SetProvider(string.Empty);

            configuration.Save();

            Assert.Multiple(() =>
            {
                Assert.That(configuration.GetProviderValidationMessage(), Is.Not.Empty);
                Assert.That(configuration.HasNotice(), Is.False);
            });
        }

        // "ftp://..." is a well-formed URL, so it clears the browser's type=url check and
        // reaches the application's own http(s) rule - which is the rule under test here.
        [Test]
        public void SaveConfiguration_WithNonHttpDeploymentUrl_ShowsValidationFeedback()
        {
            var (_, configuration, _) = OpenConfigurationForNewEnvironment("cfg-bad-url");

            configuration.SetDeploymentUrl("ftp://files.example.com");
            configuration.SetProvider(ValidProvider);

            configuration.Save();

            Assert.Multiple(() =>
            {
                Assert.That(configuration.GetError(), Does.Contain("http"));
                Assert.That(configuration.HasNotice(), Is.False);
            });
        }

        [Test]
        public void SaveConfiguration_WithConfigurationKeyAndNoValue_ShowsValidationFeedback()
        {
            var (_, configuration, _) = OpenConfigurationForNewEnvironment("cfg-empty-value");

            configuration.SetDeploymentUrl(ValidUrl);
            configuration.SetProvider(ValidProvider);
            configuration.SetConfigurationItem(0, "REGION", string.Empty);

            configuration.Save();

            Assert.Multiple(() =>
            {
                Assert.That(configuration.GetError(), Does.Contain("REGION"));
                Assert.That(configuration.GetError(), Does.Contain("requires a value"));
                Assert.That(configuration.HasNotice(), Is.False);
            });
        }

        [Test]
        public void SaveConfiguration_WithDuplicateKeyAcrossConfigAndSecrets_ShowsValidationFeedback()
        {
            var (_, configuration, _) = OpenConfigurationForNewEnvironment("cfg-dupe-key");

            configuration.SetDeploymentUrl(ValidUrl);
            configuration.SetProvider(ValidProvider);
            configuration.SetConfigurationItem(0, "API_KEY", "plain-value");
            configuration.SetSecureValue(0, "API_KEY", "secret-value");

            configuration.Save();

            Assert.Multiple(() =>
            {
                Assert.That(configuration.GetError(), Does.Contain("unique"));
                Assert.That(configuration.HasNotice(), Is.False);
            });
        }

        [Test]
        public void SaveConfiguration_WithSecureKeyAndNoValue_ShowsValidationFeedback()
        {
            var (_, configuration, _) = OpenConfigurationForNewEnvironment("cfg-empty-secret");

            configuration.SetDeploymentUrl(ValidUrl);
            configuration.SetProvider(ValidProvider);
            configuration.SetSecureValue(0, "API_KEY", string.Empty);

            configuration.Save();

            Assert.Multiple(() =>
            {
                Assert.That(configuration.GetError(), Does.Contain("API_KEY"));
                Assert.That(configuration.HasNotice(), Is.False);
            });
        }

        // ------------------------------------------------------------------
        // AC3 - Protect sensitive information
        // ------------------------------------------------------------------

        [Test]
        public void SecureValue_OnceStored_IsNotReturnedToTheBrowser()
        {
            const string secret = "e2e-secret-do-not-echo-9f3a2b";

            var (_, configuration, _) = OpenConfigurationForNewEnvironment("cfg-secret");

            configuration.SetDeploymentUrl(ValidUrl);
            configuration.SetProvider(ValidProvider);
            configuration.SetSecureValue(0, "DB_PASSWORD", secret);

            configuration.SaveAndWait();
            Assert.That(configuration.WaitForNotice(), Is.True);

            configuration.Reload();

            Assert.Multiple(() =>
            {
                Assert.That(
                    configuration.GetSecureValueKey(0),
                    Is.EqualTo("DB_PASSWORD"),
                    "The key is not sensitive and should still be listed.");
                Assert.That(
                    configuration.GetSecureValueFieldText(0),
                    Is.Empty,
                    "The stored secret must not be pre-filled back into the form.");
                Assert.That(
                    configuration.GetSecureValuePlaceholder(0),
                    Does.Contain("Set"),
                    "The row should show that a value is stored without revealing it.");
                Assert.That(configuration.IsSecureValueMasked(0), Is.True, "Secret field should be masked.");
                Assert.That(configuration.IsSecureKeyLocked(0), Is.True, "A stored secret's key should be locked.");
                Assert.That(
                    configuration.PageSourceContains(secret),
                    Is.False,
                    "The secret must not appear anywhere in the rendered page.");
                Assert.That(
                    configuration.BrowserStorageContains(secret),
                    Is.False,
                    "The secret must not be cached in local or session storage.");
            });
        }

        [Test]
        public void SecureValue_LeftBlankOnResave_IsKeptWithoutBeingExposed()
        {
            const string secret = "e2e-secret-keep-unchanged-4c71d0";

            var (_, configuration, _) = OpenConfigurationForNewEnvironment("cfg-secret-keep");

            configuration.SetDeploymentUrl(ValidUrl);
            configuration.SetProvider(ValidProvider);
            configuration.SetSecureValue(0, "DB_PASSWORD", secret);
            configuration.SaveAndWait();
            Assert.That(configuration.WaitForNotice(), Is.True);

            // Re-save with the secret box left blank - the stored value should be kept.
            configuration.SetProvider("Azure");
            configuration.SaveAndWait();

            Assert.Multiple(() =>
            {
                Assert.That(configuration.HasError(), Is.False, "A blank secret box should not be treated as missing.");
                Assert.That(configuration.GetNotice(), Does.Contain("Configuration saved"));
            });

            configuration.Reload();

            Assert.Multiple(() =>
            {
                Assert.That(configuration.GetProvider(), Is.EqualTo("Azure"));
                Assert.That(configuration.GetSecureValueKey(0), Is.EqualTo("DB_PASSWORD"));
                Assert.That(configuration.HasStoredIndicator(0), Is.True, "The secret should still be marked as set.");
                Assert.That(configuration.PageSourceContains(secret), Is.False);
            });
        }
    }
}