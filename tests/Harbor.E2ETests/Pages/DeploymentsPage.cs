using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Pages
{
    // NOTE: Deployments.tsx has no data-testid attributes (unlike LoginPage/ProjectsPage's
    // markup), so these locators fall back to aria-label and text matching. This is more
    // brittle than the data-testid pattern used elsewhere in the app - worth raising with
    // the dev team as a follow-up so this page can adopt the same convention.
    public class DeploymentsPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        public DeploymentsPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(20));
            // React re-renders can swap the element out between "found" and "read" -
            // treat that as "not ready yet" and keep polling, same as NotFound.
            _wait.IgnoreExceptionTypes(typeof(NoSuchElementException), typeof(StaleElementReferenceException));
        }

        private IWebElement StatusFilter => _wait.Until(d => d.FindElement(By.CssSelector("select[aria-label='Filter deployment status']")));
        private IWebElement HistorySection => _wait.Until(d => d.FindElement(By.CssSelector("section[aria-label='Deployment history']")));
        // These wait rather than doing a one-shot FindElement because the whole table
        // (buttons included) is swapped out for a "Loading..." message during each fetch.
        private IWebElement PreviousButton => _wait.Until(d => d.FindElement(By.XPath("//button[text()='Previous']")));
        private IWebElement NextButton => _wait.Until(d => d.FindElement(By.XPath("//button[text()='Next']")));
        private IWebElement PageLabel => _wait.Until(d => d.FindElement(By.XPath("//span[starts-with(text(),'Page ')]")));
        private IWebElement DetailsPanel => _wait.Until(d => d.FindElement(By.CssSelector("aside[aria-label='Deployment details']")));

        public void NavigateTo()
        {
            _driver.Navigate().GoToUrl("http://localhost:8080/deployments");
        }

        public void FilterByStatus(string status)
        {
            var target = string.IsNullOrEmpty(status) ? "All statuses" : status;
            new SelectElement(StatusFilter).SelectByText(target);

            if (string.IsNullOrEmpty(status)) return; // "All statuses" has no single status to assert on

            // Block until the refetch has actually landed and every visible row matches -
            // without this, callers can grab a row reference mid-re-render and get an
            // ElementClickIntercepted/stale error on the very next action.
            _wait.Until(d =>
            {
                var statuses = GetVisibleStatuses();
                return statuses.Count > 0 && statuses.All(s => s == status);
            });
        }

        public IReadOnlyList<IWebElement> GetRows()
        {
            _wait.Until(d => HistorySection);
            return _driver.FindElements(By.CssSelector("section[aria-label='Deployment history'] tbody tr"));
        }

        public IReadOnlyList<string> GetVisibleStatuses()
        {
            return GetRows()
                .Select(r => r.FindElement(By.CssSelector("td:first-child span")).Text.Trim())
                .ToList();
        }

        public string GetEmptyStateMessage()
        {
            return _wait.Until(d => d.FindElement(By.XPath("//p[contains(text(),'No deployments match this filter.')]"))).Text;
        }

        // _wait.Until() treats a returned `false` or empty string as "not ready yet" and
        // keeps polling until it times out - fine for FindElement (which never legitimately
        // returns null), wrong here: a `false`/not-disabled result is a valid, final answer,
        // not a signal to keep retrying. So these use a plain retry that only re-runs on
        // StaleElementReferenceException (the element being swapped out mid-read) and lets
        // any real result - true or false - return immediately.
        private T RetryOnStale<T>(Func<T> read)
        {
            var deadline = DateTime.UtcNow.Add(TimeSpan.FromSeconds(20));
            while (true)
            {
                try { return read(); }
                catch (StaleElementReferenceException) when (DateTime.UtcNow < deadline) { }
            }
        }

        public bool IsPreviousDisabled() => RetryOnStale(() => PreviousButton.GetAttribute("disabled") != null);
        public bool IsNextDisabled() => RetryOnStale(() => NextButton.GetAttribute("disabled") != null);
        public string GetCurrentPageLabel() => RetryOnStale(() => PageLabel.Text);

        public void ClickNext()
        {
            var previousLabel = RetryOnStale(() => PageLabel.Text);
            NextButton.Click();
            _wait.Until(d => PageLabel.Text != previousLabel);
        }

        public void ClickPrevious()
        {
            var previousLabel = RetryOnStale(() => PageLabel.Text);
            PreviousButton.Click();
            _wait.Until(d => PageLabel.Text != previousLabel);
        }

        public void ClickDetailsForVersion(string version)
        {
            var row = GetRows().First(r => r.Text.Contains(version));
            row.FindElement(By.XPath(".//button[text()='Details']")).Click();
            _wait.Until(d => DetailsPanel != null); // wait for the placeholder to be replaced
        }

        public string GetDetailsPlaceholder()
        {
            return _wait.Until(d => d.FindElement(By.XPath("//aside[contains(text(),'Select a deployment')]"))).Text;
        }

        public bool HasFailureBanner()
        {
            // Waits for the panel itself first, then checks its content directly -
            // a Succeeded deployment legitimately has zero matches here, so no wait on the banner itself.
            return DetailsPanel.FindElements(By.XPath(".//strong[text()='Deployment failed']")).Count > 0;
        }

        public string GetFailureReasonText()
        {
            return DetailsPanel.FindElement(By.XPath(".//strong[text()='Deployment failed']/following-sibling::p")).Text;
        }

        public IReadOnlyList<string> GetLogLines()
        {
            return DetailsPanel.FindElements(By.CssSelector("ol li")).Select(li => li.Text).ToList();
        }

        public string GetNoLogsMessage()
        {
            return DetailsPanel.FindElement(By.XPath(".//h3[text()='Execution logs']/following-sibling::p")).Text;
        }
    }
}