using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Pages
{
    public class ProjectsPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        public ProjectsPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(20));
        }

        private IWebElement NewProjectLink => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='new-project-link']")));

        public void NavigateTo()
        {
            _driver.Navigate().GoToUrl("http://localhost:5173/projects");
        }

        public void ClickNewProject()
        {
            NewProjectLink.Click();
        }

        public IReadOnlyList<IWebElement> GetProjectCards()
        {
            _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='projects-list']")));
            return _driver.FindElements(By.CssSelector("[data-testid='project-card']"));
        }

        public bool HasProjectNamed(string name)
        {
            return GetProjectCards().Any(card => GetCardName(card) == name);
        }

        // Project cards render the name in an <h6> (data-testid="project-name"); the
        // heading level is a styling detail, so assert on the test id rather than the tag.
        private static string GetCardName(IWebElement card)
        {
            return card.FindElement(By.CssSelector("[data-testid='project-name']")).Text.Trim();
        }

        public void ClickEnvironmentsFor(string name)
        {
            var card = GetProjectCards().First(c => GetCardName(c) == name);
            card.FindElement(By.CssSelector("[data-testid='project-environments-link']")).Click();
        }

        /// <summary>
        /// Opens a project's settings page. Projects are no longer edited at /projects/{id}/edit -
        /// the settings gear on the card navigates to /projects/{id}/settings.
        /// </summary>
        public void ClickSettingsFor(string name)
        {
            var card = GetProjectCards().First(c => GetCardName(c) == name);
            card.FindElement(By.CssSelector("[data-testid='project-settings-button']")).Click();
        }
    }
}
