using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Pages
{
    // NOTE: Deployments.tsx renders a div-based list (not a table) and the status filter is a
    // custom FilterDropdown, not a native <select>. These locators use the data-testid hooks
    // added to Deployments.tsx / FilterDropdown.tsx for this purpose.
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

        private IWebElement StatusFilter => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='status-filter']")));
        private IWebElement PreviousButton => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='previous-page-button']")));
        private IWebElement NextButton => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='next-page-button']")));

        /// <summary>
        /// Non-waiting read of the pagination bar's "Showing X to Y of Z" text.
        ///
        /// This must NOT be a WebDriverWait: the bar is unmounted while a page change refetches
        /// (Deployments.tsx swaps the whole list for a spinner while `loading` is true), and a
        /// nested wait would burn its own full timeout inside a caller's wait condition, then
        /// throw a WebDriverTimeoutException the outer wait does not ignore. Callers wrap this
        /// in their own _wait.Until, which already ignores NoSuchElementException.
        /// </summary>
        private string ReadPageLabel() => _driver.FindElement(By.CssSelector("[data-testid='pagination-label']")).Text;

        public void NavigateTo()
        {
            _driver.Navigate().GoToUrl("http://localhost:5173/deployments");
        }

        /// <summary>
        /// The status filter's option label for a value, which is not always what the row badge
        /// renders: mapDeployStatus() in deploymentService.tsx displays a succeeded deployment
        /// as "Success" even though the filter option is called "Succeeded".
        /// </summary>
        public static string ExpectedBadgeLabel(string status) =>
            status.Equals("Succeeded", StringComparison.OrdinalIgnoreCase) ? "Success" : status;

        /// <summary>
        /// Selects a status in the custom FilterDropdown. The trigger has to be opened first and
        /// the option is a <li>, so this cannot use Selenium's SelectElement.
        /// Pass an empty string to reset to "All statuses".
        /// </summary>
        public void FilterByStatus(string status)
        {
            var target = string.IsNullOrEmpty(status) ? "All statuses" : status;

            IWebElement option = null;
            for (var attempt = 0; attempt < 3 && option == null; attempt++)
            {
                // Only click when the panel is actually closed. Clicking on every poll can
                // toggle the panel shut again while it is still animating open.
                if (!IsOptionsPanelOpen())
                {
                    StatusFilter.Click();
                }

                option = FindVisibleOptionOrNull(target, TimeSpan.FromSeconds(5));
            }

            if (option == null)
            {
                throw new InvalidOperationException($"Could not open the status filter option '{target}'.");
            }

            ((IJavaScriptExecutor)_driver).ExecuteScript("arguments[0].scrollIntoView({block:'center'});", option);
            option.Click();

            if (string.IsNullOrEmpty(status))
            {
                // "All statuses" has no single status to assert on - just wait for rows to land.
                _wait.Until(d => d.FindElements(By.CssSelector("[data-testid='deployment-row']")).Count > 0);
                return;
            }

            var expected = ExpectedBadgeLabel(status);

            // Block until the refetch has actually landed and every visible row matches -
            // without this, callers can grab a row reference mid-re-render and get an
            // ElementClickIntercepted/stale error on the very next action.
            _wait.Until(d =>
            {
                var statuses = GetVisibleStatuses();
                return statuses.Count > 0 && statuses.All(s => s == expected);
            });
        }

        /// <summary>
        /// Finds the filter option that is both readable and clickable.
        ///
        /// The element is re-found on every poll rather than captured once: React re-renders the
        /// option list as it animates, and a captured reference goes stale, so a captured-element
        /// wait would just retry a dead element until it times out. Option text is also empty
        /// while the panel is collapsed, which is why this requires a non-empty match plus
        /// Displayed/Enabled.
        /// </summary>
        private IWebElement FindVisibleOptionOrNull(string target, TimeSpan timeout)
        {
            try
            {
                return new WebDriverWait(_driver, timeout)
                    .Until(d => d.FindElements(By.CssSelector("[data-testid='status-filter-options'] li"))
                        .FirstOrDefault(li =>
                        {
                            try
                            {
                                return li.Text.Trim().Equals(target, StringComparison.OrdinalIgnoreCase)
                                       && li.Displayed
                                       && li.Enabled;
                            }
                            catch (StaleElementReferenceException) { return false; }
                        }));
            }
            catch (WebDriverTimeoutException)
            {
                return null;
            }
        }

        private bool IsOptionsPanelOpen()
        {
            try
            {
                var panel = _driver.FindElement(By.CssSelector("[data-testid='status-filter-options']"));
                return panel.Displayed;
            }
            catch (NoSuchElementException)
            {
                return false;
            }
        }

        public IReadOnlyList<IWebElement> GetRows()
        {
            _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='deployment-row']")));
            return _driver.FindElements(By.CssSelector("[data-testid='deployment-row']"));
        }

        public IReadOnlyList<string> GetVisibleStatuses()
        {
            // Read the badge label only - the status cell also holds the deployment duration,
            // so the cell's full text is e.g. "Succeeded 4m" rather than just the status.
            return GetRows()
                .Select(r => r.FindElement(By.CssSelector("[data-testid='status-badge-label']")).Text.Trim())
                .ToList();
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
        public string GetCurrentPageLabel() => RetryOnStale(() => ReadPageLabel());

        /// <summary>
        /// Whether the list is showing its first page. The pagination bar reads
        /// "Showing {first} to {last} of {total} deployments" (there is no "Page N of M" text
        /// any more), so the current page is derived from the first row shown.
        ///
        /// A plain read, not a wait: callers assert on both true and false, and Until() can only
        /// ever return once its predicate is true.
        /// </summary>
        public bool IsShowingFirstPage()
        {
            return RetryOnStale(() =>
                ReadPageLabel().Replace(",", "").Contains("Showing 1 to "));
        }

        public void ClickNext() => ClickPageButton(NextButton);

        public void ClickPrevious() => ClickPageButton(PreviousButton);

        private void ClickPageButton(IWebElement button)
        {
            var before = _wait.Until(d => ReadPageLabel());
            ((IJavaScriptExecutor)_driver).ExecuteScript("arguments[0].scrollIntoView({block:'center'});", button);
            _wait.Until(d => button.Displayed && button.Enabled);
            button.Click();

            // Wait for the bar to come back with a different range, i.e. the refetch for the new
            // page has landed.
            _wait.Until(d => ReadPageLabel() != before);
        }

        /// <summary>
        /// Opens a deployment's detail page. The list used to open an inline details panel via a
        /// "Details" button; clicking a row now navigates to the service deployment detail route
        /// (ServiceDetails.tsx -> "deployments/:deploymentId" -> DeploymentDetails).
        /// </summary>
        public void OpenForVersion(string version)
        {
            var row = GetRows().First(r => r.Text.Contains(version));
            ((IJavaScriptExecutor)_driver).ExecuteScript("arguments[0].scrollIntoView({block:'center'});", row);
            _wait.Until(d => row.Displayed && row.Enabled);
            row.Click();
            _wait.Until(d => d.Url.Contains("/deployments/"));
        }
    }

    /// <summary>
    /// Deployment detail page at /projects/{pid}/services/{sid}/deployments/{id}. This is where
    /// the failure reason and execution logs that the old inline details panel showed now live.
    /// </summary>
    public class DeploymentDetailsPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        public DeploymentDetailsPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(20));
            _wait.IgnoreExceptionTypes(typeof(NoSuchElementException), typeof(StaleElementReferenceException));
        }

        public void WaitUntilLoaded()
        {
            _wait.Until(d => d.Url.Contains("/deployments/"));

            // Log lines are only rendered for expanded steps/groups, and which ones start
            // expanded depends on the deployment, so click "Expand all" to reveal the full log
            // rather than assuming a particular accordion state.
            var expandAll = _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='expand-all-logs-button']")));
            expandAll.Click();
            _wait.Until(d => d.FindElements(By.CssSelector("[data-testid='deployment-log-line']")).Count > 0);
        }

        public IReadOnlyList<string> GetLogLines()
        {
            return _wait.Until(d => d.FindElements(By.CssSelector("[data-testid='deployment-log-line']")))
                .Select(li => li.Text)
                .ToList();
        }

        /// <summary>
        /// The failure reason shown in the page's failure banner, or null when the deployment
        /// did not fail (or no reason was recorded).
        /// </summary>
        public string GetFailureReason()
        {
            var banners = _driver.FindElements(By.CssSelector("[data-testid='deployment-failure-reason']"));
            return banners.Count == 0 ? null : banners[0].Text;
        }
    }
}