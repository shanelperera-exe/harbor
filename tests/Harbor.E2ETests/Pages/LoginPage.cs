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
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(20));
        }

        private IWebElement UsernameInput => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='username-input']")));
        private IWebElement PasswordInput => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='password-input']")));
        private IWebElement LoginButton => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='login-button']")));
        private IWebElement ErrorMessage => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='error-message']")));

        public void NavigateTo()
        {
            _driver.Navigate().GoToUrl("http://localhost:5173/login");
        }

        public void Login(string username, string password)
        {
            // Wait for React app to render (username input should be present and visible)
            var wait = new WebDriverWait(_driver, TimeSpan.FromSeconds(30));
            wait.Until(d => {
                try {
                    var el = d.FindElement(By.CssSelector("[data-testid='username-input']"));
                    return el.Displayed;
                } catch {
                    return false;
                }
            });
            
            UsernameInput.Clear();
            UsernameInput.SendKeys(username);
            
            PasswordInput.Clear();
            PasswordInput.SendKeys(password);
            
            Console.WriteLine("=== Before click, URL: " + _driver.Url);
            
            LoginButton.Click();
            
            // Wait a bit for the form submission to process
            Thread.Sleep(3000);
            
            Console.WriteLine("=== After click + wait, URL: " + _driver.Url);
            
            // Print browser console logs
            var logs = _driver.Manage().Logs.GetLog(LogType.Browser);
            foreach (var log in logs)
            {
                Console.WriteLine($"BROWSER LOG: {log.Level} - {log.Message}");
            }
            
            // Wait for navigation away from login page
            wait.Until(d => !d.Url.Contains("/login"));
            Console.WriteLine("=== After wait, URL: " + _driver.Url);
        }

        public string GetErrorMessage()
        {
            return ErrorMessage.Text;
        }
    }
}
