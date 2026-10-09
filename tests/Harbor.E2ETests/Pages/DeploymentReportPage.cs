using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Pages
{
    public class DeploymentReportPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        public DeploymentReportPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(25));
            _wait.IgnoreExceptionTypes(typeof(NoSuchElementException), typeof(StaleElementReferenceException));
        }

        private IWebElement ProjectFilter => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='report-project-filter']")));
        private IWebElement EnvironmentFilter => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='report-environment-filter']")));
        private IWebElement StatusFilter => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='report-status-filter']")));
        private IWebElement StartDateInput => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='report-start-date']")));
        private IWebElement EndDateInput => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='report-end-date']")));
        private IWebElement GenerateButton => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='generate-report-btn']")));

        public void NavigateTo()
        {
            _driver.Navigate().GoToUrl("http://localhost:5173/reports");
            _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='generate-report-btn']")));
        }

        public void SelectFilterOption(string filterTestId, string optionLabel)
        {
            var trigger = _wait.Until(d => d.FindElement(By.CssSelector($"[data-testid='{filterTestId}']")));
            var optionsListTestId = $"{filterTestId}-options";

            IWebElement? option = null;
            for (var attempt = 0; attempt < 3 && option == null; attempt++)
            {
                if (!IsDropdownOpen(optionsListTestId))
                {
                    trigger.Click();
                }

                option = FindVisibleOptionOrNull(optionsListTestId, optionLabel, TimeSpan.FromSeconds(4));
            }

            if (option == null)
            {
                throw new InvalidOperationException($"Could not find option '{optionLabel}' in dropdown '{filterTestId}'.");
            }

            Thread.Sleep(300);
            ((IJavaScriptExecutor)_driver).ExecuteScript("arguments[0].scrollIntoView({block:'center'});", option);
            option.Click();
        }

        private bool IsDropdownOpen(string optionsListTestId)
        {
            try
            {
                var el = _driver.FindElement(By.CssSelector($"[data-testid='{optionsListTestId}']"));
                return el.Displayed;
            }
            catch (NoSuchElementException)
            {
                return false;
            }
        }

        private IWebElement? FindVisibleOptionOrNull(string optionsListTestId, string target, TimeSpan timeout)
        {
            try
            {
                return new WebDriverWait(_driver, timeout).Until(d =>
                    d.FindElements(By.CssSelector($"[data-testid='{optionsListTestId}'] li"))
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

        public void SelectProject(string projectName) => SelectFilterOption("report-project-filter", projectName);
        public void SelectEnvironment(string environment) => SelectFilterOption("report-environment-filter", environment);
        public void SelectStatus(string status) => SelectFilterOption("report-status-filter", status);

        public void SetStartDate(string date)
        {
            StartDateInput.Clear();
            StartDateInput.SendKeys(date);
        }

        public void SetEndDate(string date)
        {
            EndDateInput.Clear();
            EndDateInput.SendKeys(date);
        }

        public void ClickGenerate()
        {
            GenerateButton.Click();
            _wait.Until(d =>
            {
                try
                {
                    var btn = d.FindElement(By.CssSelector("[data-testid='generate-report-btn']"));
                    return btn.Enabled && !btn.Text.Contains("Generating");
                }
                catch (StaleElementReferenceException) { return false; }
            });
        }

        public void ClickReset()
        {
            var resetBtn = _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='reset-report-btn']")));
            resetBtn.Click();
        }

        public string GetTotalDeploymentsStat() =>
            _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='stat-total']"))).Text.Trim();

        public string GetSuccessfulStat() =>
            _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='stat-successful']"))).Text.Trim();

        public string GetFailedStat() =>
            _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='stat-failed']"))).Text.Trim();

        public string GetSuccessRateStat() =>
            _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='stat-success-rate']"))).Text.Trim();

        public string? GetAverageDurationStat()
        {
            try
            {
                return _driver.FindElement(By.CssSelector("[data-testid='stat-avg-duration']")).Text.Trim();
            }
            catch (NoSuchElementException)
            {
                return null;
            }
        }

        public IReadOnlyList<IWebElement> GetRows() =>
            _driver.FindElements(By.CssSelector("[data-testid='report-row']"));

        public IReadOnlyList<string> GetVisibleStatuses() =>
            GetRows()
                .Select(r =>
                {
                    try { return r.FindElement(By.CssSelector("[data-testid='status-badge-label']")).Text.Trim(); }
                    catch (StaleElementReferenceException) { return null; }
                })
                .Where(s => s != null)
                .Select(s => s!)
                .ToList();

        public bool IsEmptyStateDisplayed()
        {
            try
            {
                var empty = _driver.FindElement(By.CssSelector("[data-testid='report-empty']"));
                return empty.Displayed;
            }
            catch (NoSuchElementException)
            {
                return false;
            }
        }

        public string? GetErrorMessage()
        {
            try
            {
                var err = _driver.FindElement(By.CssSelector("[data-testid='report-error']"));
                return err.Displayed ? err.Text.Trim() : null;
            }
            catch (NoSuchElementException)
            {
                return null;
            }
        }
    }
}
