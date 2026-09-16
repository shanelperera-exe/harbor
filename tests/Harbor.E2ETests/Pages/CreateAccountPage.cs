using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Pages
{
    public class CreateAccountPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        public CreateAccountPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(20));
        }

        private IWebElement UsernameInput => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='username-input']")));
        private IWebElement EmailInput => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='email-input']")));
        private IWebElement PasswordInput => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='password-input']")));
        private IWebElement CreateAccountButton => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='create-account-button']")));
        private IWebElement ErrorMessage => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='error-message']")));

        public void NavigateTo()
        {
            for (var attempt = 1; attempt <= 2; attempt++)
            {
                _driver.Navigate().GoToUrl("http://localhost:5173/register");

                try
                {
                    _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='username-input']")).Displayed);
                    return;
                }
                catch (WebDriverTimeoutException) when (attempt < 2)
                {
                    _driver.Navigate().Refresh();
                }
            }
        }

        public void CreateAccount(string username, string email, string password)
        {
            UsernameInput.Clear();
            UsernameInput.SendKeys(username);

            EmailInput.Clear();
            EmailInput.SendKeys(email);
            
            PasswordInput.Clear();
            PasswordInput.SendKeys(password);
            
            CreateAccountButton.Click();
        }

        public string GetErrorMessage()
        {
            return ErrorMessage.Text;
        }
    }
}
