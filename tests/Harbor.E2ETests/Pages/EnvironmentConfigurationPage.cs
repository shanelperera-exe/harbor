using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Pages
{
    // Page object for US-11 "Configure environment"
    // (/projects/{projectId}/environments/{environmentId}/configure).
    //
    // The screen has no data-testid attributes on its inputs, so locators are anchored on
    // stable, user-visible things instead: the input type/placeholder, and the section that
    // owns each "Add ..." button. That keeps the selectors readable and stops a Tailwind
    // class change from breaking the suite.
    public class EnvironmentConfigurationPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        private static readonly By ConfigSectionBy =
            By.XPath("//section[.//button[contains(., 'Add configuration value')]]");

        private static readonly By SecretSectionBy =
            By.XPath("//section[.//button[contains(., 'Add secure value')]]");

        public EnvironmentConfigurationPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(20));
        }

        private IWebElement DeploymentUrlInput =>
            _wait.Until(d => d.FindElement(By.CssSelector("input[type='url']")));

        private IWebElement ProviderInput =>
            _wait.Until(d => d.FindElement(By.CssSelector("input[list='provider-suggestions']")));

        private IWebElement SaveButton =>
            _wait.Until(d => d.FindElement(By.CssSelector("form button[type='submit']")));

        private IWebElement ConfigSection => _wait.Until(d => d.FindElement(ConfigSectionBy));

        private IWebElement SecretSection => _wait.Until(d => d.FindElement(SecretSectionBy));

        /// <summary>Waits until the configuration form has finished loading.</summary>
        public void WaitUntilLoaded()
        {
            _wait.Until(d => d.FindElements(By.CssSelector("input[type='url']")).Count > 0);
        }

        public bool IsLoaded()
        {
            try
            {
                WaitUntilLoaded();
                return true;
            }
            catch (WebDriverTimeoutException)
            {
                return false;
            }
        }

        public void Reload()
        {
            _driver.Navigate().Refresh();
            WaitUntilLoaded();
        }

        // ---------- Deployment information ----------

        public void SetDeploymentUrl(string value)
        {
            var input = DeploymentUrlInput;
            input.Clear();
            if (!string.IsNullOrEmpty(value)) input.SendKeys(value);
        }

        public void SetProvider(string value)
        {
            var input = ProviderInput;
            input.Clear();
            if (!string.IsNullOrEmpty(value)) input.SendKeys(value);
        }

        public string GetDeploymentUrl() => DeploymentUrlInput.GetAttribute("value") ?? string.Empty;

        public string GetProvider() => ProviderInput.GetAttribute("value") ?? string.Empty;

        // ---------- Configuration items ----------

        private IReadOnlyList<IWebElement> ConfigKeyInputs =>
            ConfigSection.FindElements(By.CssSelector("input[placeholder='KEY']"));

        private void AddConfigRow()
        {
            var button = ConfigSection.FindElement(
                By.XPath(".//button[contains(., 'Add configuration value')]"));
            ScrollToAndClick(button);
        }

        /// <summary>Fills the configuration row at <paramref name="index"/>, adding rows if needed.</summary>
        public void SetConfigurationItem(int index, string key, string value)
        {
            while (ConfigKeyInputs.Count <= index) AddConfigRow();

            var keyInput = ConfigKeyInputs[index];
            keyInput.Clear();
            if (!string.IsNullOrEmpty(key)) keyInput.SendKeys(key);

            var valueInput = keyInput.FindElement(By.XPath("./following-sibling::input"));
            valueInput.Clear();
            if (!string.IsNullOrEmpty(value)) valueInput.SendKeys(value);
        }

        public string GetConfigurationKey(int index) =>
            ConfigKeyInputs[index].GetAttribute("value") ?? string.Empty;

        public string GetConfigurationValue(int index) =>
            ConfigKeyInputs[index]
                .FindElement(By.XPath("./following-sibling::input"))
                .GetAttribute("value") ?? string.Empty;

        public int ConfigurationRowCount => ConfigKeyInputs.Count;

        // ---------- Secure values ----------

        private IReadOnlyList<IWebElement> SecretKeyInputs =>
            SecretSection.FindElements(By.CssSelector("input[placeholder='KEY']"));

        private static IWebElement SecretValueInputFor(IWebElement keyInput) =>
            keyInput.FindElement(By.XPath("./following-sibling::div//input"));

        private void AddSecretRow()
        {
            var button = SecretSection.FindElement(
                By.XPath(".//button[contains(., 'Add secure value')]"));
            ScrollToAndClick(button);
        }

        /// <summary>Fills the secure-value row at <paramref name="index"/>, adding rows if needed.</summary>
        public void SetSecureValue(int index, string key, string value)
        {
            while (SecretKeyInputs.Count <= index) AddSecretRow();

            var keyInput = SecretKeyInputs[index];
            if (keyInput.Enabled)
            {
                keyInput.Clear();
                if (!string.IsNullOrEmpty(key)) keyInput.SendKeys(key);
            }

            var valueInput = SecretValueInputFor(keyInput);
            valueInput.Clear();
            if (!string.IsNullOrEmpty(value)) valueInput.SendKeys(value);
        }

        public string GetSecureValueKey(int index) =>
            SecretKeyInputs[index].GetAttribute("value") ?? string.Empty;

        /// <summary>The text currently sitting in the secret's value box (expected to be blank once stored).</summary>
        public string GetSecureValueFieldText(int index) =>
            SecretValueInputFor(SecretKeyInputs[index]).GetAttribute("value") ?? string.Empty;

        public string GetSecureValuePlaceholder(int index) =>
            SecretValueInputFor(SecretKeyInputs[index]).GetAttribute("placeholder") ?? string.Empty;

        /// <summary>True when the secret input is rendered as a password field (value not shown on screen).</summary>
        public bool IsSecureValueMasked(int index) =>
            SecretValueInputFor(SecretKeyInputs[index]).GetAttribute("type") == "password";

        /// <summary>A stored secret's key is locked so it can't be re-pointed at a different secret.</summary>
        public bool IsSecureKeyLocked(int index) => !SecretKeyInputs[index].Enabled;

        /// <summary>True when the row shows the "value is set" indicator.</summary>
        public bool HasStoredIndicator(int index)
        {
            var row = SecretKeyInputs[index].FindElement(By.XPath("./parent::div"));
            return row.FindElements(By.CssSelector("[aria-label='Value is set']")).Count > 0;
        }

        public int SecureValueRowCount => SecretKeyInputs.Count;

        // ---------- Submitting ----------

        public void Save()
        {
            ScrollToAndClick(SaveButton);
        }

        /// <summary>Clicks Save and waits for the save to settle (button leaves its "Saving…" state).</summary>
        public void SaveAndWait()
        {
            Save();
            _wait.Until(d =>
            {
                try
                {
                    var button = d.FindElement(By.CssSelector("form button[type='submit']"));
                    return button.Enabled && !button.Text.Contains("Saving");
                }
                catch (StaleElementReferenceException)
                {
                    return false;
                }
            });
        }

        // ---------- Feedback ----------

        public string GetError()
        {
            var error = _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='configuration-error']")));
            return error.Text;
        }

        public bool HasError() =>
            _driver.FindElements(By.CssSelector("[data-testid='configuration-error']")).Count > 0;

        public string GetNotice()
        {
            var notice = _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='configuration-notice']")));
            return notice.Text;
        }

        public bool HasNotice() =>
            _driver.FindElements(By.CssSelector("[data-testid='configuration-notice']")).Count > 0;

        /// <summary>Waits for the success notice; returns false if it never appears.</summary>
        public bool WaitForNotice()
        {
            try
            {
                _wait.Until(d => d.FindElements(By.CssSelector("[data-testid='configuration-notice']")).Count > 0);
                return true;
            }
            catch (WebDriverTimeoutException)
            {
                return false;
            }
        }

        // ---------- Browser-level (HTML5) validation ----------

        /// <summary>The browser's own validation message for the Deployment URL field ("" when valid).</summary>
        public string GetDeploymentUrlValidationMessage() => ValidationMessageOf(DeploymentUrlInput);

        public string GetProviderValidationMessage() => ValidationMessageOf(ProviderInput);

        private string ValidationMessageOf(IWebElement element)
        {
            var message = ((IJavaScriptExecutor)_driver)
                .ExecuteScript("return arguments[0].validationMessage;", element);
            return message?.ToString() ?? string.Empty;
        }

        // ---------- Sensitive-data checks ----------

        /// <summary>
        /// True if the raw secret text appears anywhere in the rendered DOM. Used to prove
        /// a saved secure value is not echoed back to the browser (AC3).
        /// </summary>
        public bool PageSourceContains(string text) =>
            _driver.PageSource.Contains(text, StringComparison.OrdinalIgnoreCase);

        /// <summary>True if the secret text appears in browser local/session storage.</summary>
        public bool BrowserStorageContains(string text)
        {
            var script = @"
                var needle = arguments[0].toLowerCase();
                var blob = '';
                for (var i = 0; i < localStorage.length; i++) {
                    blob += localStorage.key(i) + '=' + localStorage.getItem(localStorage.key(i)) + ';';
                }
                for (var j = 0; j < sessionStorage.length; j++) {
                    blob += sessionStorage.key(j) + '=' + sessionStorage.getItem(sessionStorage.key(j)) + ';';
                }
                return blob.toLowerCase().indexOf(needle) !== -1;";

            var result = ((IJavaScriptExecutor)_driver).ExecuteScript(script, text);
            return result is bool found && found;
        }

        // ---------- Helpers ----------

        private void ScrollToAndClick(IWebElement element)
        {
            ((IJavaScriptExecutor)_driver)
                .ExecuteScript("arguments[0].scrollIntoView({block:'center'});", element);
            _wait.Until(d => element.Displayed && element.Enabled);
            element.Click();
        }
    }
}