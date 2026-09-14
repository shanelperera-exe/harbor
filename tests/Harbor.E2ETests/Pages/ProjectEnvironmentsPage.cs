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

        public string GetNotice()
        {
            var notice = _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='environment-notice']")));
            return notice.Text;
        }

        public bool HasNotice()
        {
            return _driver.FindElements(By.CssSelector("[data-testid='environment-notice']")).Count > 0;
        }

        private IWebElement GetCard(string name)
        {
            return _wait.Until(d => d.FindElements(By.CssSelector("[data-testid='environments-list'] > div"))
                .First(card => card.Text.Contains(name)));
        }

        public void StartEdit(string name)
        {
            var card = GetCard(name);
            card.FindElement(By.XPath(".//button[text()='Edit']")).Click();
        }

        public void SaveEdit(string newName, string newType)
        {
            var nameInput = _wait.Until(d => d.FindElement(By.CssSelector("input[aria-label='Environment name']")));
            nameInput.Clear();
            nameInput.SendKeys(newName);

            new SelectElement(_driver.FindElement(By.CssSelector("select[aria-label='Environment type']"))).SelectByText(newType);

            _driver.FindElement(By.XPath("//button[text()='Save']")).Click();
        }

        public void Remove(string name)
        {
            var card = GetCard(name);
            card.FindElement(By.XPath(".//button[text()='Remove']")).Click();

            _wait.Until(d => d.SwitchTo().Alert() != null);
            _driver.SwitchTo().Alert().Accept();
        }
    }
}