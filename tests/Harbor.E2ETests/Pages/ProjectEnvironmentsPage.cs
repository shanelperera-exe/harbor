using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Pages
{
    public class ProjectEnvironmentsPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;
        private readonly WebDriverWait _extendedWait;

        public ProjectEnvironmentsPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(20));
            _extendedWait = new WebDriverWait(driver, TimeSpan.FromSeconds(30));
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
                try
                {
                    var btn = _driver.FindElement(By.CssSelector("[data-testid='create-environment-form'] button"));
                    return !(btn.GetAttribute("disabled") ?? "").Contains("disabled") ||
                           btn.Text.Contains("Create environment");
                }
                catch
                {
                    return false;
                }
            });

            // Wait for either the card to appear OR an error banner to show - whichever
            // happens first. Previously this only waited for the card, so a real
            // creation failure (bad request, 403, validation error, etc.) was
            // indistinguishable from CI slowness: both just burned the full timeout.
            var outcome = _extendedWait.Until(d =>
            {
                try
                {
                    var cards = d.FindElements(By.CssSelector("[data-testid='environments-list'] > div"));
                    if (cards.Any(card =>
                    {
                        try { return card.Displayed && card.Text.Contains(name); }
                        catch { return false; }
                    }))
                    {
                        return "ok";
                    }

                    var errors = d.FindElements(By.CssSelector("[data-testid='environment-error']"));
                    if (errors.Count > 0 && errors[0].Displayed)
                    {
                        return "error:" + errors[0].Text;
                    }

                    return null;
                }
                catch
                {
                    return null;
                }
            });

            if (outcome != null && outcome.StartsWith("error:"))
            {
                throw new InvalidOperationException(
                    $"Environment creation failed for '{name}': {outcome.Substring("error:".Length)}");
            }
        }

        public bool HasEnvironment(string name, string type)
        {
            try
            {
                return _extendedWait.Until(d =>
                {
                    try
                    {
                        var cards = d.FindElements(By.CssSelector("[data-testid='environments-list'] > div"));
                        return cards.Any(card =>
                        {
                            try
                            {
                                return card.Displayed && card.Text.Contains(name);
                            }
                            catch
                            {
                                return false;
                            }
                        });
                    }
                    catch
                    {
                        return false;
                    }
                });
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
            return _extendedWait.Until(d =>
            {
                try
                {
                    var cards = d.FindElements(By.CssSelector("[data-testid='environments-list'] > div"));
                    var card = cards.FirstOrDefault(c =>
                    {
                        try
                        {
                            return c.Displayed && c.Text.Contains(name);
                        }
                        catch
                        {
                            return false;
                        }
                    });
                    return card;
                }
                catch
                {
                    return null;
                }
            });
        }

        public void OpenConfiguration(string name)
        {
            var card = GetCard(name);
            var link = card.FindElement(By.XPath(".//a[contains(., 'Configure deployment')]"));
            ScrollToAndClick(link);

            _wait.Until(d => d.Url.Contains("/configure"));
        }

        public string GetCardText(string name)
        {
            return GetCard(name).Text;
        }

        public void StartEdit(string name)
        {
            var card = GetCard(name);
            var editButton = card.FindElement(By.XPath(".//button[text()='Edit']"));
            _wait.Until(d => editButton.Displayed && editButton.Enabled);
            ScrollToAndClick(editButton);

            _wait.Until(d => d.FindElements(By.CssSelector("input[aria-label='Environment name']")).Count > 0);
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

            // Wait for saving to complete (edit mode exits when saving finishes)
            _wait.Until(d => d.FindElements(By.CssSelector("input[aria-label='Environment name']")).Count == 0);
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