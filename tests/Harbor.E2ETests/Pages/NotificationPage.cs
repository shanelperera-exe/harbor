using System;
using System.Collections.Generic;
using System.Threading;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace Harbor.E2ETests.Pages
{
    public class NotificationPage
    {
        private readonly IWebDriver _driver;
        private readonly WebDriverWait _wait;

        public NotificationPage(IWebDriver driver)
        {
            _driver = driver;
            _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(20));
            _wait.IgnoreExceptionTypes(typeof(NoSuchElementException), typeof(StaleElementReferenceException));
        }

        private IWebElement NotificationBellButton => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='notification-bell-btn']")));
        private IWebElement NotificationBadge => _driver.FindElement(By.CssSelector("[data-testid='notification-badge']"));
        private IWebElement NotificationPanel => _wait.Until(d => d.FindElement(By.CssSelector("[data-testid='notification-panel']")));
        private IWebElement NotificationsEmptyState => _driver.FindElement(By.CssSelector("[data-testid='notifications-empty']"));
        private IWebElement MarkAllReadButton => _driver.FindElement(By.CssSelector("[data-testid='mark-all-read-btn']"));

        public bool IsNotificationBellVisible()
        {
            try
            {
                return NotificationBellButton.Displayed;
            }
            catch (NoSuchElementException)
            {
                return false;
            }
        }

        public bool IsNotificationBellPresent()
        {
            try
            {
                var el = _driver.FindElement(By.CssSelector("[data-testid='notification-bell-btn']"));
                return el != null;
            }
            catch (NoSuchElementException)
            {
                return false;
            }
        }

        public bool IsNotificationBadgeVisible()
        {
            try
            {
                return NotificationBadge.Displayed;
            }
            catch (NoSuchElementException)
            {
                return false;
            }
        }

        public int GetUnreadCount()
        {
            if (!IsNotificationBadgeVisible()) return 0;
            var text = NotificationBadge.Text;
            if (string.IsNullOrWhiteSpace(text)) return 1;
            // Handle "99+"
            if (text.Contains("+")) return 100;
            return int.TryParse(text, out var count) ? count : 0;
        }

        public bool IsNotificationPanelVisible()
        {
            try
            {
                return NotificationPanel.Displayed;
            }
            catch (NoSuchElementException)
            {
                return false;
            }
        }

        public bool IsNotificationsEmpty()
        {
            try
            {
                return NotificationsEmptyState.Displayed;
            }
            catch (NoSuchElementException)
            {
                return false;
            }
        }

        public void ClickNotificationBell()
        {
            var bell = NotificationBellButton;
            // Use regular click to trigger React's onClick handler
            bell.Click();
            System.Threading.Thread.Sleep(500);
        }

        public void OpenPanel()
        {
            if (!IsNotificationPanelVisible())
            {
                ClickNotificationBell();
                
                // Wait for panel to appear with retries (React state update may be async)
                for (int attempt = 0; attempt < 10; attempt++)
                {
                    System.Threading.Thread.Sleep(500);
                    if (IsNotificationPanelVisible())
                    {
                        break;
                    }
                    // Try clicking again if panel didn't open
                    if (attempt < 5)
                    {
                        ClickNotificationBell();
                    }
                }
                
                // Final wait with standard timeout
                _wait.Until(d => IsNotificationPanelVisible());
            }

            // Wait for notification items to load (or empty state)
            _wait.Until(d => {
                var items = d.FindElements(By.CssSelector("[data-testid^='notification-item-']"));
                var empty = d.FindElements(By.CssSelector("[data-testid='notifications-empty']"));
                return items.Count > 0 || empty.Count > 0;
            });
        }

        public void ClosePanelByClickingOutside()
        {
            // Click on the notification bell button again to close (more reliable than body click)
            var bell = NotificationBellButton;
            ((IJavaScriptExecutor)_driver).ExecuteScript("arguments[0].click();", bell);
            System.Threading.Thread.Sleep(300);
            _wait.Until(d => !IsNotificationPanelVisible());
        }

        public void ClosePanelByEscape()
        {
            _driver.FindElement(By.TagName("body")).SendKeys(Keys.Escape);
            _wait.Until(d => !IsNotificationPanelVisible());
        }

        public List<NotificationItem> GetNotificationItems()
        {
            var items = new List<NotificationItem>();
            var elements = _driver.FindElements(By.CssSelector("[data-testid^='notification-item-']"));
            foreach (var el in elements)
            {
                items.Add(new NotificationItem(el));
            }
            return items;
        }

        public bool IsMarkAllReadVisible()
        {
            try
            {
                return MarkAllReadButton.Displayed;
            }
            catch (NoSuchElementException)
            {
                return false;
            }
        }

        public void ClickMarkAllRead()
        {
            MarkAllReadButton.Click();
        }

        public class NotificationItem
        {
            private readonly IWebElement _element;
            public NotificationItem(IWebElement element) => _element = element;

            public int Id => int.Parse(_element.GetAttribute("data-testid")!.Replace("notification-item-", ""));
            public bool IsRead()
            {
                // If it has blue background indicating unread, or unread dot - but we can also check classes
                var classes = _element.GetAttribute("class");
                return !classes.Contains("bg-blue-50");
            }

            public bool IsSuccess()
            {
                try
                {
                    var dot = _element.FindElement(By.CssSelector("span[class*='bg-emerald-500']"));
                    return dot != null;
                }
                catch (NoSuchElementException)
                {
                    // Fallback: check message contains "deployed successfully"
                    var message = _element.FindElement(By.CssSelector("p.line-clamp-2")).Text;
                    return message.Contains("deployed successfully", StringComparison.OrdinalIgnoreCase);
                }
            }

            public bool IsFailure()
            {
                try
                {
                    var dot = _element.FindElement(By.CssSelector("span[class*='bg-red-500']"));
                    return dot != null;
                }
                catch (NoSuchElementException)
                {
                    // Fallback: check message contains "failed to deploy"
                    var message = _element.FindElement(By.CssSelector("p.line-clamp-2")).Text;
                    return message.Contains("failed to deploy", StringComparison.OrdinalIgnoreCase);
                }
            }

            public string GetAttribute(string name) => _element.GetAttribute(name);

            public void Click()
            {
                _element.Click();
            }
        }
    }
}
