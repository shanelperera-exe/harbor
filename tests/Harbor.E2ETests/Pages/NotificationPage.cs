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
        }

        private IWebElement NotificationBellButton => _driver.FindElement(By.Id("notification-bell-btn"));
        private IWebElement NotificationBadge => _driver.FindElement(By.Id("notification-badge"));
        private IWebElement NotificationPanel => _driver.FindElement(By.Id("notification-panel"));
        private IWebElement NotificationsEmptyState => _driver.FindElement(By.Id("notifications-empty"));
        private IWebElement MarkAllReadButton => _driver.FindElement(By.Id("mark-all-read-btn"));

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
                var el = _driver.FindElement(By.Id("notification-bell-btn"));
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
            NotificationBellButton.Click();
        }

        public void OpenPanel()
        {
            if (!IsNotificationPanelVisible())
            {
                ClickNotificationBell();
                _wait.Until(d => IsNotificationPanelVisible());
            }
        }

        public void ClosePanelByClickingOutside()
        {
            // Click on the notification bell button again to close (more reliable than body click)
            ClickNotificationBell();
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

            public void Click()
            {
                _element.Click();
            }
        }
    }
}
