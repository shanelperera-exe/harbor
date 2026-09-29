using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Pages
{
    /// <summary>
    /// Project settings screen at /projects/{id}/settings. Projects used to be edited at
    /// /projects/{id}/edit, but that route no longer exists - the card's settings gear opens
    /// this page, and removal is a hard delete from the Danger Zone (there is no archive UI).
    /// </summary>
    public class ProjectSettingsPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        public ProjectSettingsPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(20));
        }

        private IWebElement NameInput => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='project-name-input']")));
        private IWebElement EditNameButton => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='edit-project-name-button']")));
        private IWebElement SaveButton => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='save-project-button']")));
        private IWebElement DeleteButton => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='delete-project-button']")));

        public string GetName()
        {
            return NameInput.GetAttribute("value") ?? "";
        }

        /// <summary>Renames the project and waits for the edit form to close.</summary>
        public void RenameTo(string newName)
        {
            EditNameButton.Click();
            _wait.Until(d =>
            {
                var input = d.FindElement(By.CssSelector("[data-testid='project-name-input']"));
                // readOnly is absent entirely until the field enters edit mode.
                var readOnly = input.GetAttribute("readonly");
                return readOnly is null || !readOnly.Contains("true");
            });

            var field = NameInput;
            field.Clear();
            field.SendKeys(newName);

            SaveButton.Click();
            _wait.Until(d => d.FindElements(By.CssSelector("[data-testid='edit-project-name-button']")).Count > 0);
        }

        /// <summary>
        /// Deletes the project. The modal dictates the exact phrase to type, so it is read from
        /// the rendered hint rather than re-derived here. (The project prompt is
        /// "delete project {name}"; the environment one is "sudo delete environment {name}".)
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
