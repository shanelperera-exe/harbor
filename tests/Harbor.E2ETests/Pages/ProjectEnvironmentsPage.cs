using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Pages
{
    /// <summary>
    /// Project environments screen at /projects/{id}/environments.
    ///
    /// The UI no longer offers an inline create form, an environment "type" dropdown, or
    /// per-card Edit/Remove/Configure controls. Environments are created through a modal
    /// that only asks for a name (the backend type is inferred from that name - see
    /// handleCreateEnvironment in ProjectEnvironments.tsx), and every other operation now
    /// lives on the environment's own Settings page.
    /// </summary>
    public class ProjectEnvironmentsPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;
        private readonly WebDriverWait _extendedWait;

        public ProjectEnvironmentsPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(20));
            _extendedWait = new WebDriverWait(driver, TimeSpan.FromSeconds(30));
        }

        private void ScrollToAndClick(IWebElement element)
        {
            ((IJavaScriptExecutor)_driver).ExecuteScript("arguments[0].scrollIntoView({block:'center'});", element);
            _wait.Until(d => element.Displayed && element.Enabled);
            element.Click();
        }

        /// <summary>
        /// Creates an environment through the "Add environment" modal. The type is not
        /// selectable in the UI any more - it is derived from the name - so <paramref name="type"/>
        /// is accepted only to keep callers readable and is deliberately unused.
        /// </summary>
        public void Create(string name, string type = "")
        {
            var addButton = _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='add-environment-button']")));
            ScrollToAndClick(addButton);

            var form = _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='create-environment-form']")));
            var nameInput = _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='create-environment-name-input']")));

            nameInput.Clear();
            nameInput.SendKeys(name);

            var submit = _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='create-environment-submit']")));
            _wait.Until(d => submit.Enabled);
            ScrollToAndClick(submit);

            WaitForEnvironment(name);
        }

        private IWebElement GetSection(string name)
        {
            return _extendedWait.Until(d =>
            {
                var sections = d.FindElements(By.CssSelector("[data-testid='environment-section']"));
                return sections.FirstOrDefault(s =>
                {
                    try
                    {
                        return s.GetAttribute("data-env-name") == name && s.Displayed;
                    }
                    catch (StaleElementReferenceException)
                    {
                        return false;
                    }
                });
            });
        }

        public void WaitForEnvironment(string name)
        {
            GetSection(name);
        }

        public bool HasEnvironment(string name, string type = "")
        {
            try
            {
                GetSection(name);
                return true;
            }
            catch (WebDriverTimeoutException)
            {
                return false;
            }
        }

        /// <summary>Opens the environment's Settings page (name edit + delete).</summary>
        public void OpenSettings(string name)
        {
            var section = GetSection(name);
            ScrollToAndClick(section.FindElement(By.CssSelector("[data-testid='environment-settings-button']")));
            _wait.Until(d => d.Url.Contains("/settings"));
        }

        /// <summary>Returns to the environments list after the settings screen has navigated back.</summary>
        public void NavigateBackToEnvironments()
        {
            _wait.Until(d => d.Url.Contains("/environments") && !d.Url.Contains("/settings"));
        }

        public string GetError()
        {
            return _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='environment-error']"))).Text;
        }
    }

    /// <summary>Environment settings screen at /projects/{id}/environments/{envId}/settings.</summary>
    public class EnvironmentSettingsPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        public EnvironmentSettingsPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(20));
        }

        private IWebElement NameInput => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='environment-name-input']")));
        private IWebElement EditNameButton => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='edit-environment-name-button']")));
        private IWebElement SaveButton => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='save-environment-button']")));
        private IWebElement DeleteButton => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='delete-environment-button']")));

        public string GetName()
        {
            return NameInput.GetAttribute("value") ?? "";
        }

        public void RenameTo(string newName)
        {
            EditNameButton.Click();

            _wait.Until(d =>
            {
                var input = d.FindElement(By.CssSelector("[data-testid='environment-name-input']"));
                var readOnly = input.GetAttribute("readonly");
                return readOnly is null || !readOnly.Contains("true");
            });

            var field = NameInput;
            field.Clear();
            field.SendKeys(newName);

            SaveButton.Click();
            _wait.Until(d => d.FindElements(By.CssSelector("[data-testid='edit-environment-name-button']")).Count > 0);
        }

        /// <summary>
        /// Deletes the environment. The modal dictates the exact phrase to type, so it is read
        /// from the rendered hint rather than re-derived here (the project equivalent is
        /// "delete project {name}" and the environment one is "sudo delete environment {name}").
        /// </summary>
        public void Delete()
        {
            DeleteButton.Click();

            var expected = _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='expected-confirm-text']")).Text.Trim());

            var confirmInput = _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='confirm-text-input']")));
            confirmInput.Clear();
            confirmInput.SendKeys(expected);

            _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='confirm-delete-button']")).Enabled);
            _driver.FindElement(By.CssSelector("[data-testid='confirm-delete-button']")).Click();
        }
    }
}
