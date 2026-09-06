using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Pages
{
    public class LoginPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        public LoginPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(10));
        }

        private IWebElement UsernameInput => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='username-input']")));
        private IWebElement PasswordInput => _driver.FindElement(By.CssSelector("[data-testid='password-input']"));
        private IWebElement LoginButton => _driver.FindElement(By.CssSelector("[data-testid='login-button']"));
        private IWebElement ErrorMessage => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='error-message']")));

        public void NavigateTo()
        {
            _driver.Navigate().GoToUrl("http://localhost:5173/login");
        }

        public void Login(string username, string password)
        {
            UsernameInput.Clear();
            UsernameInput.SendKeys(username);
            
            PasswordInput.Clear();
            PasswordInput.SendKeys(password);
            
            LoginButton.Click();
        }

        public string GetErrorMessage()
        {
            return ErrorMessage.Text;
        }
    }
}
