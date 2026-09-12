using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Pages
{
    public class CreateProjectPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        public CreateProjectPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(10));
        }

        private IWebElement NameInput => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='project-name-input']")));
        private IWebElement DescriptionInput => _driver.FindElement(By.CssSelector("[data-testid='project-description-input']"));
        private IWebElement RepoInput => _driver.FindElement(By.CssSelector("[data-testid='project-repo-input']"));
        private IWebElement CreateButton => _driver.FindElement(By.CssSelector("[data-testid='create-project-button']"));
        private IWebElement GeneralErrorMessage => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='error-message']")));

        public void NavigateTo()
        {
            _driver.Navigate().GoToUrl("http://localhost:5173/projects/new");
        }

        public void FillForm(string name, string? description = null, string? repositoryUrl = null)
        {
            NameInput.Clear();
            NameInput.SendKeys(name);

            if (description != null)
            {
                DescriptionInput.Clear();
                DescriptionInput.SendKeys(description);
            }

            if (repositoryUrl != null)
            {
                RepoInput.Clear();
                RepoInput.SendKeys(repositoryUrl);
            }
        }

        public void Submit()
        {
            CreateButton.Click();
        }

        public string GetErrorMessage()
        {
            return GeneralErrorMessage.Text;
        }

        public string GetNameFieldError()
        {
            var error = _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='project-name-input'] ~ p")));
            return error.Text;
        }
    }
}