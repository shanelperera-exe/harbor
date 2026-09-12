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
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(10));
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
            return GetProjectCards().Any(card => card.FindElement(By.TagName("h2")).Text == name);
        }

        public void ClickEditFor(string name)
        {
            var card = GetProjectCards().First(c => c.FindElement(By.TagName("h2")).Text == name);
            card.FindElement(By.CssSelector("[data-testid='edit-project-link']")).Click();
        }
    }
}