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

        private void ScrollToAndClick(IWebElement element)
        {
            ((IJavaScriptExecutor)_driver).ExecuteScript("arguments[0].scrollIntoView(true);", element);
            _wait.Until(d => element.Displayed && element.Enabled);
            element.Click();
        }

        public void Create(string name, string type)
        {
            _wait.Until(d => d.FindElements(By.CssSelector("[data-testid='create-environment-form']")).Count > 0);

            var form = _driver.FindElement(By.CssSelector("[data-testid='create-environment-form']"));
            var nameInput = form.FindElement(By.CssSelector("input"));
            var select = form.FindElement(By.CssSelector("select"));
            var submitButton = form.FindElement(By.CssSelector("button"));

            nameInput.Clear();
            nameInput.SendKeys(name);
            new SelectElement(select).SelectByText(type);

            // Wait for button to be clickable before clicking
            _wait.Until(d => submitButton.Enabled && submitButton.Displayed);
            ScrollToAndClick(submitButton);

            // Wait for the saving state to complete (button becomes re-enabled)
            _wait.Until(d =>
            {
                var btn = _driver.FindElement(By.CssSelector("[data-testid='create-environment-form'] button"));
                return !btn.GetAttribute("disabled").Contains("disabled") ||
                       btn.Text.Contains("Create environment");
            });
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
            var editButton = card.FindElement(By.XPath(".//button[text()='Edit']"));
            _wait.Until(d => editButton.Displayed && editButton.Enabled);
            ScrollToAndClick(editButton);
        }

        public void SaveEdit(string newName, string newType)
        {
            var nameInput = _wait.Until(d => d.FindElement(By.CssSelector("input[aria-label='Environment name']")));
            nameInput.Clear();
            nameInput.SendKeys(newName);

            new SelectElement(_driver.FindElement(By.CssSelector("select[aria-label='Environment type']"))).SelectByText(newType);

            var saveButton = _driver.FindElement(By.XPath("//button[text()='Save']"));
            _wait.Until(d => saveButton.Displayed && saveButton.Enabled);
            ScrollToAndClick(saveButton);

            // Wait for saving to complete
            _wait.Until(d =>
            {
                var btn = _driver.FindElement(By.XPath("//button[text()='Save']"));
                return btn == null || !btn.Enabled || btn.Text.Contains("Save");
            });
        }

        public void Remove(string name)
        {
            var card = GetCard(name);
            var removeButton = card.FindElement(By.XPath(".//button[text()='Remove']"));
            _wait.Until(d => removeButton.Displayed && removeButton.Enabled);
            ScrollToAndClick(removeButton);

            _wait.Until(d => d.SwitchTo().Alert() != null);
            _driver.SwitchTo().Alert().Accept();

            // Wait for the removal to complete (card disappears or list updates)
            _wait.Until(d =>
            {
                var cards = d.FindElements(By.CssSelector("[data-testid='environments-list'] > div"));
                return cards.Count == 0 || !cards.Any(c => c.Text.Contains(name));
            });
        }
    }
}