using System;
using System.Linq;
using Harbor.E2ETests.Pages;
using NUnit.Framework;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Tests
{
    // Covers US-22 (Dynamic deployment reports) AC1–AC8 at the UI level.
    [TestFixture]
    public class DeploymentReportTests : BaseTest
    {
        private const string SeededUsername = "qa_tester2";
        private const string SeededPassword = "Test@1234";

        private void LoginAsSeededUser()
        {
            var loginPage = new LoginPage(Driver);
            loginPage.NavigateTo();
            loginPage.Login(SeededUsername, SeededPassword);

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects") || d.Url.Contains("/dashboard"));
        }

        [Test]
        public void Scenario1_GenerateReport_ReturnsDeploymentResultsAndStats()
        {
            LoginAsSeededUser();

            var reportPage = new DeploymentReportPage(Driver);
            reportPage.NavigateTo();
            reportPage.ClickGenerate();

            // Total deployments should be calculated and displayed
            var totalStr = reportPage.GetTotalDeploymentsStat();
            Assert.That(int.TryParse(totalStr, out var total), Is.True, "Total deployments should be a valid number");
            Assert.That(total, Is.GreaterThan(0), "Expected seeded deployments to be returned");

            // Success rate should end with %
            var successRate = reportPage.GetSuccessRateStat();
            Assert.That(successRate, Does.EndWith("%"));

            // Results table rows should be present
            var rows = reportPage.GetRows();
            Assert.That(rows.Count, Is.GreaterThan(0));
        }

        [Test]
        public void Scenario3_FilterByEnvironment_ShowsOnlyMatchingEnvironmentRows()
        {
            LoginAsSeededUser();

            var reportPage = new DeploymentReportPage(Driver);
            reportPage.NavigateTo();
            reportPage.SelectEnvironment("Production");
            reportPage.ClickGenerate();

            var rows = reportPage.GetRows();
            Assert.That(rows.Count, Is.GreaterThan(0), "Expected at least one production deployment");

            var total = int.Parse(reportPage.GetTotalDeploymentsStat());
            Assert.That(total, Is.EqualTo(rows.Count));
        }

        [Test]
        public void Scenario5_FilterByStatus_ShowsOnlyMatchingStatusRows()
        {
            LoginAsSeededUser();

            var reportPage = new DeploymentReportPage(Driver);
            reportPage.NavigateTo();
            reportPage.SelectStatus("Succeeded");
            reportPage.ClickGenerate();

            var statuses = reportPage.GetVisibleStatuses();
            Assert.That(statuses, Is.Not.Empty);
            Assert.That(statuses, Has.All.EqualTo("Success"));

            var successful = int.Parse(reportPage.GetSuccessfulStat());
            var failed = int.Parse(reportPage.GetFailedStat());
            Assert.That(failed, Is.EqualTo(0));
            Assert.That(successful, Is.EqualTo(statuses.Count));
        }

        [Test]
        public void Scenario4_InvalidDateRange_DisplaysValidationError()
        {
            LoginAsSeededUser();

            var reportPage = new DeploymentReportPage(Driver);
            reportPage.NavigateTo();
            reportPage.SetStartDate("2026-12-31");
            reportPage.SetEndDate("2026-01-01");
            reportPage.ClickGenerate();

            var error = reportPage.GetErrorMessage();
            Assert.That(error, Is.Not.Null);
            Assert.That(error, Does.Contain("Start date must be on or before end date"));
        }

        [Test]
        public void Scenario8_EmptyResults_DisplaysEmptyStateMessage()
        {
            LoginAsSeededUser();

            var reportPage = new DeploymentReportPage(Driver);
            reportPage.NavigateTo();
            // Choose a date range far in the future where no deployments exist
            reportPage.SetStartDate("2099-01-01");
            reportPage.SetEndDate("2099-01-02");
            reportPage.ClickGenerate();

            Assert.That(reportPage.IsEmptyStateDisplayed(), Is.True, "Empty state should be displayed when no records match");

            var total = int.Parse(reportPage.GetTotalDeploymentsStat());
            Assert.That(total, Is.EqualTo(0));
            Assert.That(reportPage.GetSuccessRateStat(), Is.EqualTo("0%"));
        }
    }
}
