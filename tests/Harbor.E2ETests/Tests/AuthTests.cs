using System;
using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using Harbor.E2ETests.Pages;

namespace Harbor.E2ETests.Tests
{
    [TestFixture]
    public class AuthTests : BaseTest
    {
        [Test]
        public void Login_WithInvalidCredentials_ShowsErrorMessage()
        {
            var loginPage = new LoginPage(Driver);
            loginPage.NavigateTo();

            loginPage.Login("invalid_username", "wrong_password123");

            var error = loginPage.GetErrorMessage();
            Assert.That(error, Is.Not.Empty);
            Assert.That(error, Does.Contain("Invalid").IgnoreCase.Or.Contain("failed").IgnoreCase);
        }

        [Test]
        public void CreateAccount_WithAlreadyUsedEmail_ShowsErrorMessage()
        {
            var uniqueId = Guid.NewGuid().ToString("N").Substring(0, 8);
            var username = $"user_{uniqueId}";
            var email = $"user_{uniqueId}@example.com";
            var password = "ValidPassword123!";

            var createAccountPage = new CreateAccountPage(Driver);
            createAccountPage.NavigateTo();
            
            // First time - should succeed
            createAccountPage.CreateAccount(username, email, password);
            
            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            wait.Until(d => d.Url.Contains("/dashboard"));

            // Log out
            Driver.Manage().Cookies.DeleteAllCookies();
            ((OpenQA.Selenium.IJavaScriptExecutor)Driver).ExecuteScript("window.localStorage.clear();");

            // Second time - should fail
            createAccountPage.NavigateTo();
            createAccountPage.CreateAccount(username, email, password);

            var error = createAccountPage.GetErrorMessage();
            Assert.That(error, Is.Not.Empty);
        }
        [Test]
        public void CreateAccount_WithValidDetails_RedirectsToDashboard()
        {
            var createAccountPage = new CreateAccountPage(Driver);
            createAccountPage.NavigateTo();

            // Clear any existing state just in case
            Driver.Manage().Cookies.DeleteAllCookies();
            ((OpenQA.Selenium.IJavaScriptExecutor)Driver).ExecuteScript("window.localStorage.clear();");
            
            var uniqueId = Guid.NewGuid().ToString("N").Substring(0, 8);
            var username = $"user_{uniqueId}";
            var email = $"user_{uniqueId}@example.com";
            var password = "ValidPassword123!";

            createAccountPage.CreateAccount(username, email, password);

            // Wait for redirection to dashboard
            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            try {
                wait.Until(d => d.Url.Contains("/dashboard"));
            } catch (WebDriverTimeoutException) {
                var error = "";
                try { error = createAccountPage.GetErrorMessage(); } catch {}
                Assert.Fail($"Failed to redirect to dashboard. Error on page: {error}");
            }
            
            Assert.That(Driver.Url, Does.Contain("/dashboard"));
        }

        [Test]
        public void Login_WithValidCredentials_RedirectsToDashboard()
        {
            // First create an account so we know it exists
            var uniqueId = Guid.NewGuid().ToString("N").Substring(0, 8);
            var username = $"user_{uniqueId}";
            var email = $"user_{uniqueId}@example.com";
            var password = "ValidPassword123!";
            
            var createAccountPage = new CreateAccountPage(Driver);
            createAccountPage.NavigateTo();
            createAccountPage.CreateAccount(username, email, password);
            
            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            try {
                wait.Until(d => d.Url.Contains("/dashboard"));
            } catch (WebDriverTimeoutException) {
                var error = "";
                try { error = createAccountPage.GetErrorMessage(); } catch {}
                Assert.Fail($"Setup: Failed to redirect to dashboard during account creation. Error: {error}");
            }

            // Now log out (clear local storage and cookies) to test the login page
            Driver.Manage().Cookies.DeleteAllCookies();
            ((OpenQA.Selenium.IJavaScriptExecutor)Driver).ExecuteScript("window.localStorage.clear();");

            // Navigate to login
            var loginPage = new LoginPage(Driver);
            loginPage.NavigateTo();

            loginPage.Login(username, password);

            wait.Until(d => d.Url.Contains("/dashboard"));
            Assert.That(Driver.Url, Does.Contain("/dashboard"));
        }
    }
}
