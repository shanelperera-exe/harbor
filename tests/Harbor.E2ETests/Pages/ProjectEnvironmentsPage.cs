using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Pages
{
    public class ProjectEnvironmentsPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        public ProjectEnvironmentsPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(20));
        }

        public void Create(string name, string type)
        {
            _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='create-environment-form']")));
            _driver.FindElement(By.CssSelector("[data-testid='create-environment-form'] input")).SendKeys(name);
            new SelectElement(_driver.FindElement(By.CssSelector("[data-testid='create-environment-form'] select"))).SelectByText(type);
            _driver.FindElement(By.CssSelector("[data-testid='create-environment-form'] button")).Click();
        }

        public bool HasEnvironment(string name, string type)
        {
            try
            {
                return _wait.Until(d => d.FindElements(By.CssSelector("[data-testid='environments-list'] > div"))
                    .Any(card => card.Text.Contains(name) && card.Text.Contains(type)));
            }
            catch (WebDriverTimeoutException)
            {
                return false;
            }
        }

        public string GetError()
        {
            var error = _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='environment-error']")));
            return error.Text;
        }
    }
}
