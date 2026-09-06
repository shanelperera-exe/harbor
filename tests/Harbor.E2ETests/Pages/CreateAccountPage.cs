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
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(10));
        }

        private IWebElement UsernameInput => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='username-input']")));
        private IWebElement EmailInput => _driver.FindElement(By.CssSelector("[data-testid='email-input']"));
        private IWebElement PasswordInput => _driver.FindElement(By.CssSelector("[data-testid='password-input']"));
        private IWebElement CreateAccountButton => _driver.FindElement(By.CssSelector("[data-testid='create-account-button']"));
        private IWebElement ErrorMessage => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='error-message']")));

        public void NavigateTo()
        {
            _driver.Navigate().GoToUrl("http://localhost:5173/register");
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
