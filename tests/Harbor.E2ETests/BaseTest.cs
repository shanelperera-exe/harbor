using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;

namespace Harbor.E2ETests
{
    public class BaseTest
    {
        protected IWebDriver Driver { get; private set; }

[SetUp]
        public virtual void Setup()
        {
            var options = new ChromeOptions();
            options.AddArgument("--headless");
            options.AddArgument("--disable-gpu");
            options.AddArgument("--no-sandbox");
            options.AddArgument("--disable-dev-shm-usage");
            options.AddArgument("--window-size=1920,1080");
            options.AddArgument("--disable-web-security");
            options.AddArgument("--disable-features=VizDisplayCompositor");
            options.AddArgument("--remote-debugging-port=9222");
            // Enable browser logging
            options.SetLoggingPreference(LogType.Browser, LogLevel.All);

            Driver = new ChromeDriver(options);
            Driver.Manage().Window.Maximize();
        }

        [TearDown]
        public void TearDown()
        {
            if (Driver != null)
            {
                Driver.Quit();
                Driver.Dispose();
            }
        }
    }
}
