using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Pages
{
    public class EditProjectPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        public EditProjectPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(10));
        }

        private IWebElement NameInput => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='project-name-input']")));
        private IWebElement SaveButton => _driver.FindElement(By.CssSelector("[data-testid='save-project-button']"));
        private IWebElement ArchiveButton => _driver.FindElement(By.CssSelector("[data-testid='archive-project-button']"));
        private IWebElement GeneralErrorMessage => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='error-message']")));

        public void NavigateTo(int projectId)
        {
            _driver.Navigate().GoToUrl($"http://localhost:5173/projects/{projectId}/edit");
        }

        public void SetName(string name)
        {
            NameInput.Clear();
            NameInput.SendKeys(name);
        }

        public void Save()
        {
            SaveButton.Click();
        }

        public void Archive(bool confirm = true)
        {
            ArchiveButton.Click();
            var alert = _wait.Until(d => d.SwitchTo().Alert());
            if (confirm) alert.Accept(); else alert.Dismiss();
        }

        public string GetErrorMessage()
        {
            return GeneralErrorMessage.Text;
        }
    }
}