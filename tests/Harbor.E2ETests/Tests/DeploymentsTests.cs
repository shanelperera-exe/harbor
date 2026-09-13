using System;
using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using Harbor.E2ETests.Pages;

namespace Harbor.E2ETests.Tests
{
    // Covers US8 (Deployment history / logs) AC1-AC3 at the UI level.
    // Relies on qa_tester2 already owning 29+ seeded deployments (see docs/deployment
    // seed notes) including Deployment #30, which has a custom FailureReason and
    // populated DeploymentLogs rows - required for DetailsPanel_WithPopulatedFailedDeployment_*.
    [TestFixture]
    public class DeploymentsTests : BaseTest
    {
        private const string SeededUsername = "qa_tester2";
        private const string SeededPassword = "Test@1234";

        private void LoginAsSeededUser()
        {
            var loginPage = new LoginPage(Driver);
            loginPage.NavigateTo();
            loginPage.Login(SeededUsername, SeededPassword);

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/dashboard"));
        }

        [TestCase("Failed")]
        [TestCase("Succeeded")]
        [TestCase("Running")]
        public void StatusFilter_SelectingStatus_ShowsOnlyMatchingRows(string status)
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();
            deploymentsPage.FilterByStatus(status);

            var statuses = deploymentsPage.GetVisibleStatuses();

            Assert.That(statuses, Is.Not.Empty);
            Assert.That(statuses, Has.All.EqualTo(status));
        }

        [Test]
        public void StatusFilter_ChangingFilter_ResetsToPageOne()
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();
            deploymentsPage.FilterByStatus(""); // All statuses - 29 rows, so Next is available
            deploymentsPage.ClickNext();
            Assert.That(deploymentsPage.GetCurrentPageLabel(), Does.Contain("2"));

            deploymentsPage.FilterByStatus("Failed");

            Assert.That(deploymentsPage.GetCurrentPageLabel(), Does.Contain("1"));
        }

        [Test]
        public void Pagination_OnFirstPage_PreviousButtonIsDisabled()
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();

            Assert.That(deploymentsPage.IsPreviousDisabled(), Is.True);
        }

        [Test]
        public void Pagination_WithFewerThanTwentyResultsOnPage_NextButtonIsDisabled()
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();
            deploymentsPage.FilterByStatus(""); // 29 total: page 2 has 9 rows (< 20)
            deploymentsPage.ClickNext();

            Assert.That(deploymentsPage.IsNextDisabled(), Is.True);
        }

        [Test]
        public void DetailsPanel_BeforeSelectingRow_ShowsPlaceholder()
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();

            Assert.That(deploymentsPage.GetDetailsPlaceholder(), Does.Contain("Select a deployment"));
        }

        [Test]
        public void DetailsPanel_WithPopulatedFailedDeployment_ShowsFailureReasonAndLogs()
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();
            deploymentsPage.FilterByStatus("Failed");
            deploymentsPage.ClickDetailsForVersion("2.1.0");

            Assert.That(deploymentsPage.HasFailureBanner(), Is.True);
            Assert.That(deploymentsPage.GetFailureReasonText(),
                Does.Contain("Container failed to start"));

            var logs = deploymentsPage.GetLogLines();
            Assert.That(logs.Count, Is.EqualTo(4));
            Assert.That(logs[0], Does.Contain("Deployment started"));
            Assert.That(logs[^1], Does.Contain("OOMKilled"));
        }

        [Test]
        public void DetailsPanel_WithSucceededDeployment_DoesNotShowFailureBanner()
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();
            deploymentsPage.FilterByStatus("Succeeded");
            var rows = deploymentsPage.GetRows();
            Assert.That(rows, Is.Not.Empty);

            // Click the first Succeeded row's Details button directly.
            rows[0].FindElement(By.XPath(".//button[text()='Details']")).Click();

            Assert.That(deploymentsPage.HasFailureBanner(), Is.False);
        }
    }
}