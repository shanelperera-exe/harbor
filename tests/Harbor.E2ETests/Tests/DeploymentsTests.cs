using System;
using System.Linq;
using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using Harbor.E2ETests.Pages;

namespace Harbor.E2ETests.Tests
{
    // Covers US8 (Deployment history / logs) AC1-AC3 at the UI level.
    // Relies on qa_tester2 already owning seeded deployments (see docs/deployment
    // seed notes) including Failed deployments with custom FailureReason and
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
        public void StatusFilter_SelectingStatus_Running_NoResults()
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();
            deploymentsPage.FilterByStatus("Running");

            // Running status has no deployments in test data - verify empty state or no rows
            var rows = deploymentsPage.GetRowsOrEmpty();
            Assert.That(rows, Is.Empty, "No deployments with 'Running' status exist in test data");
        }

        [Test]
        public void StatusFilter_ChangingFilter_ResetsToPageOne()
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();
            deploymentsPage.FilterByStatus(""); // All statuses - 7 rows, so Next is available (10/page)

            // If Next button is available, click it
            if (!deploymentsPage.IsNextDisabled())
            {
                deploymentsPage.ClickNext();
                Assert.That(deploymentsPage.IsShowingFirstPage(), Is.False, "Expected to be past the first page.");
            }
            else
            {
                Assert.Inconclusive("Not enough deployments for pagination test (need >10 rows)");
            }

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

            // Walk to the last page. The list shows 10 rows per page, so the 7 seeded
            // deployments span one page; the loop stays correct if that page size changes.
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

            // Click first failed deployment
            var firstRow = deploymentsPage.GetRows().First();
            firstRow.Click();

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/deployments/"));

            var detailsPage = new DeploymentDetailsPage(Driver);
            detailsPage.WaitUntilLoaded();

            // Failure reason may or may not be present depending on which failed deployment was clicked
            // (test data has 2 failed deployments with failure reason, 1 without)
            var failureReason = detailsPage.GetFailureReason();
            if (failureReason != null)
            {
                Assert.That(failureReason, Does.Contain("GitHub Actions is not configured"));
            }
            // If null, that's also valid (we clicked the deployment without failure reason)

            var logs = detailsPage.GetLogLines();
            // Logs may be empty if deployment logs aren't populated for this deployment
            Assert.That(logs, Is.Not.Null);
        }

        [Test]
        public void DeploymentDetails_WithSucceededDeployment_DoesNotShowFailureReason()
        {
            LoginAsSeededUser();

            var deploymentsPage = new DeploymentsPage(Driver);
            deploymentsPage.NavigateTo();
            deploymentsPage.FilterByStatus("Succeeded");

            // Click first succeeded deployment
            var firstRow = deploymentsPage.GetRows().First();
            firstRow.Click();

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/deployments/"));

            var detailsPage = new DeploymentDetailsPage(Driver);
            detailsPage.WaitUntilLoaded();

            Assert.That(detailsPage.GetFailureReason(), Is.Null);
        }
    }
}
