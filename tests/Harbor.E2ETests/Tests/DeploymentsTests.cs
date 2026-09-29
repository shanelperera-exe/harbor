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
            wait.Until(d => d.Url.Contains("/projects"));
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
            Assert.That(statuses, Has.All.EqualTo(DeploymentsPage.ExpectedBadgeLabel(status)));
        }

        [Test]
        public void StatusFilter_ChangingFilter_ResetsToPageOne()
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();
            deploymentsPage.FilterByStatus(""); // All statuses - 30 rows, so Next is available
            deploymentsPage.ClickNext();
            Assert.That(deploymentsPage.IsShowingFirstPage(), Is.False, "Expected to be past the first page.");

            deploymentsPage.FilterByStatus("Failed");

            Assert.That(deploymentsPage.IsShowingFirstPage(), Is.True,
                "Changing the status filter should reset the list back to page one.");
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
        public void Pagination_WithFewerThanTwentyResultsOnLastPage_NextButtonIsDisabled()
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();
            deploymentsPage.FilterByStatus(""); // All statuses

            // Walk to the last page. The list shows 10 rows per page, so the 30 seeded
            // deployments span three pages; the loop stays correct if that page size changes.
            for (var i = 0; i < 10 && !deploymentsPage.IsNextDisabled(); i++)
            {
                deploymentsPage.ClickNext();
            }

            Assert.That(deploymentsPage.IsNextDisabled(), Is.True,
                "Next should be disabled once the last page is reached.");
        }

        // The list no longer opens an inline details panel, so "before selecting a row" is now
        // simply "the list renders rows and no detail view is open". This asserts the landing
        // state of /deployments: rows are present and the URL has not navigated to a detail page.
        [Test]
        public void DeploymentList_BeforeSelectingRow_DoesNotOpenDetailView()
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();

            Assert.That(deploymentsPage.GetRows(), Is.Not.Empty);
            Assert.That(Driver.Url, Does.Not.Contain("/deployments/"));
        }

        [Test]
        public void DeploymentDetails_WithPopulatedFailedDeployment_ShowsFailureReasonAndLogs()
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();
            deploymentsPage.FilterByStatus("Failed");
            deploymentsPage.OpenForVersion("2.1.0");

            var detailsPage = new DeploymentDetailsPage(Driver);
            detailsPage.WaitUntilLoaded();

            Assert.That(detailsPage.GetFailureReason(),
                Does.Contain("Container failed to start"));

            var logs = detailsPage.GetLogLines();
            Assert.That(logs, Is.Not.Empty);
            Assert.That(string.Join("\n", logs), Does.Contain("OOMKilled"));
        }

        [Test]
        public void DeploymentDetails_WithSucceededDeployment_DoesNotShowFailureReason()
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();
            deploymentsPage.FilterByStatus("Succeeded");
            deploymentsPage.GetRows();

            // The seeded Succeeded rows are versioned 2.0.N; pick the first one present.
            var row = deploymentsPage.GetRows().First();
            var version = row.Text.Split(' ').First(v => v.StartsWith("2.0."));
            deploymentsPage.OpenForVersion(version);

            var detailsPage = new DeploymentDetailsPage(Driver);
            detailsPage.WaitUntilLoaded();

            Assert.That(detailsPage.GetFailureReason(), Is.Null);
        }
    }
}
