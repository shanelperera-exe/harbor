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

            // Wait for dropdown animation to complete (option should be fully visible)
            _wait.Until(d => {
                try {
                    var style = option.GetAttribute("style");
                    return style == null || !style.Contains("opacity: 0") && !style.Contains("translateY(-10px)");
                } catch {
                    return false;
                }
            });

            System.Threading.Thread.Sleep(300);
            ((IJavaScriptExecutor)_driver).ExecuteScript("arguments[0].scrollIntoView({block:'center'});", option);
            // Use JavaScript click to avoid interception during animation
            ((IJavaScriptExecutor)_driver).ExecuteScript("arguments[0].click();", option);

            _wait.Until(d => !IsDropdownOpen(optionsListTestId));
            System.Threading.Thread.Sleep(200);
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

        public void SetStartDate(string date) => SetDateInput("report-start-date", date);
        public void SetEndDate(string date) => SetDateInput("report-end-date", date);

        // Used for validation testing where client-side React state must be updated
        public void SetStartDateForValidation(string date) => SetDateInputWithSendKeys("report-start-date", date);
        public void SetEndDateForValidation(string date) => SetDateInputWithSendKeys("report-end-date", date);

        private void SetDateInput(string testId, string date)
        {
            var input = _wait.Until(d => d.FindElement(By.CssSelector($"[data-testid='{testId}']")));
            
            // Use native value setter to properly update React controlled component
            ((IJavaScriptExecutor)_driver).ExecuteScript(
                "var input = arguments[0]; var date = arguments[1]; " +
                "var nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; " +
                "nativeSetter.call(input, date); " +
                "var inputEvent = new Event('input', { bubbles: true, composed: true, cancelable: true }); " +
                "input.dispatchEvent(inputEvent); " +
                "var changeEvent = new Event('change', { bubbles: true, composed: true, cancelable: true }); " +
                "input.dispatchEvent(changeEvent); " +
                "var blurEvent = new Event('blur', { bubbles: true, composed: true }); " +
                "input.dispatchEvent(blurEvent);",
                input, date);
            System.Threading.Thread.Sleep(100);
        }

        private void SetDateInputWithSendKeys(string testId, string date)
        {
            var input = _wait.Until(d => d.FindElement(By.CssSelector($"[data-testid='{testId}']")));
            input.Clear();
            input.SendKeys(date);
            input.SendKeys(OpenQA.Selenium.Keys.Tab);
            System.Threading.Thread.Sleep(100);
        }

        public void ClickGenerate()
        {
            System.Threading.Thread.Sleep(300);
            ((IJavaScriptExecutor)_driver).ExecuteScript("arguments[0].click();", GenerateButton);
            _wait.Until(d =>
            {
                try
                {
                    var btn = d.FindElement(By.CssSelector("[data-testid='generate-report-btn']"));
                    return btn.Enabled && !btn.Text.Contains("Generating");
                }
                catch (StaleElementReferenceException) { return false; }
            });
            
            // Wait for results section to be fully rendered (empty state visible or table rows visible)
            // OR for validation error to appear
            _wait.Until(d =>
            {
                try
                {
                    var empty = d.FindElements(By.CssSelector("[data-testid='report-empty']"));
                    if (empty.Count > 0 && empty[0].Displayed) return true;
                    
                    var rows = d.FindElements(By.CssSelector("[data-testid='report-row']"));
                    if (rows.Count > 0 && rows[0].Displayed) return true;
                    
                    var error = d.FindElements(By.CssSelector("[data-testid='report-error']"));
                    if (error.Count > 0 && error[0].Displayed) return true;
                    
                    return false;
                }
                catch { return false; }
            });
            
            // Small delay to ensure React rendering is complete
            System.Threading.Thread.Sleep(500);
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
                var empty = _wait.Until(d =>
                {
                    try
                    {
                        var el = d.FindElement(By.CssSelector("[data-testid='report-empty']"));
                        return el.Displayed ? el : null;
                    }
                    catch { return null; }
                });
                return empty != null && empty.Displayed;
            }
            catch (WebDriverTimeoutException)
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
