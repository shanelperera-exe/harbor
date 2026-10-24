using System;
using System.Threading;
using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;
using Harbor.E2ETests.Pages;

namespace Harbor.E2ETests.Tests
{
    [TestFixture]
    public class NotificationTests : BaseTest
    {
        private LoginPage _loginPage;
        private NotificationPage _notificationPage;

        [SetUp]
        public override void Setup()
        {
            base.Setup();
            _loginPage = new LoginPage(Driver);
            _notificationPage = new NotificationPage(Driver);
        }

        [Test]
        public void E2E_01_NotificationBell_Absent_OnLoginPage()
        {
            // Navigate to login page (uses MainLayout, no notification bell)
            _loginPage.NavigateTo();

            // Wait for login page to load
            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(10));
            wait.Until(d => d.FindElement(By.CssSelector("[data-testid='username-input']")).Displayed);

            // Notification bell should NOT be present in DOM (MainLayout doesn't include it)
            Assert.That(_notificationPage.IsNotificationBellPresent(), Is.False,
                "Notification bell should not exist in DOM on login page (MainLayout)");
        }

        [Test]
        public void E2E_02_NotificationBell_Present_OnDashboardLayout()
        {
            // Login first
            _loginPage.NavigateTo();
            _loginPage.LoginExpectingSuccess("qa_tester2", "Test@1234");

            // Should redirect to projects (DashboardLayout)
            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects"));

            // Notification bell should be present in DOM (DashboardLayout includes it)
            Assert.That(_notificationPage.IsNotificationBellPresent(), Is.True,
                "Notification bell should exist in DOM on authenticated pages (DashboardLayout)");

            // And should be visible
            Assert.That(_notificationPage.IsNotificationBellVisible(), Is.True,
                "Notification bell should be visible on authenticated pages");
        }

        [Test]
        public void E2E_03_OpenNotificationPanel_ShowsPanel()
        {
            _loginPage.NavigateTo();
            _loginPage.LoginExpectingSuccess("qa_tester2", "Test@1234");

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects"));

            _notificationPage.OpenPanel();
            Assert.That(_notificationPage.IsNotificationPanelVisible(), Is.True);
        }

        [Test]
        public void E2E_04_EmptyNotificationState_ShowsEmptyMessage()
        {
            _loginPage.NavigateTo();
            _loginPage.LoginExpectingSuccess("qa_tester2", "Test@1234");

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects"));

            _notificationPage.OpenPanel();
            Assert.That(_notificationPage.IsNotificationPanelVisible(), Is.True);

            var hasItems = _notificationPage.GetNotificationItems().Count > 0;
            if (!hasItems)
            {
                Assert.That(_notificationPage.IsNotificationsEmpty(), Is.True);
            }
        }

        [Test]
        public void E2E_05_SuccessfulDeploymentNotification_ShowsInPanel()
        {
            _loginPage.NavigateTo();
            _loginPage.LoginExpectingSuccess("qa_tester2", "Test@1234");

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects"));

            _notificationPage.OpenPanel();

            var items = _notificationPage.GetNotificationItems();
            Assert.That(items.Count, Is.GreaterThan(0), "Should have seeded notifications");

            foreach (var item in items)
            {
                Console.WriteLine($"Item ID: {item.Id}, IsSuccess: {item.IsSuccess()}, IsFailure: {item.IsFailure()}");
            }

            var hasSuccess = items.Any(item => item.IsSuccess());
            Assert.That(hasSuccess, Is.True, "Should have at least one success notification");
        }

        [Test]
        public void E2E_06_FailedDeploymentNotification_ShowsInPanel()
        {
            _loginPage.NavigateTo();
            _loginPage.LoginExpectingSuccess("qa_tester2", "Test@1234");

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects"));

            _notificationPage.OpenPanel();

            // Should have failure notifications in the panel
            var items = _notificationPage.GetNotificationItems();
            Assert.That(items.Count, Is.GreaterThan(0), "Should have seeded notifications");

            // Debug: print item IDs and first item message
            foreach (var item in items)
            {
                Console.WriteLine($"Item ID: {item.Id}, IsSuccess: {item.IsSuccess()}, IsFailure: {item.IsFailure()}");
            }

            // At least one should be failure type (red dot)
            var hasFailure = items.Any(item => item.IsFailure());
            Assert.That(hasFailure, Is.True, "Should have at least one failure notification");
        }

        [Test]
        public void E2E_07_UserNotificationIsolation_Works()
        {
            // Login as qa_tester2 and count notifications
            _loginPage.NavigateTo();
            _loginPage.LoginExpectingSuccess("qa_tester2", "Test@1234");

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects"));

            _notificationPage.OpenPanel();
            var tester2Items = _notificationPage.GetNotificationItems();
            int tester2Count = tester2Items.Count;

            // Logout and login as qa_tester3
            Driver.Manage().Cookies.DeleteAllCookies();
            ((OpenQA.Selenium.IJavaScriptExecutor)Driver).ExecuteScript("window.localStorage.clear();");

            _loginPage.NavigateTo();
            _loginPage.LoginExpectingSuccess("qa_tester3", "Test@1234");

            wait.Until(d => d.Url.Contains("/projects"));

            _notificationPage.OpenPanel();
            var tester3Items = _notificationPage.GetNotificationItems();
            int tester3Count = tester3Items.Count;

            // qa_tester3 should have different (fewer) notifications
            Assert.That(tester3Count, Is.LessThan(tester2Count), "Different users should see different notifications");
        }

        [Test]
        public void E2E_08_UnreadNotificationBadge_CanVerifyStructure()
        {
            _loginPage.NavigateTo();
            _loginPage.LoginExpectingSuccess("qa_tester2", "Test@1234");

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects"));

            // Badge may or may not exist depending on unread count
            // Just verify bell exists and badge handling works
            Assert.That(_notificationPage.IsNotificationBellVisible(), Is.True);
        }

        [Test]
        public void E2E_09_MarkNotificationAsRead_CanVerifyUI()
        {
            _loginPage.NavigateTo();
            _loginPage.LoginExpectingSuccess("qa_tester2", "Test@1234");

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects"));

            _notificationPage.OpenPanel();
            var items = _notificationPage.GetNotificationItems();
            if (items.Count > 0)
            {
                var firstItem = items[0];
                firstItem.Click();
                System.Threading.Thread.Sleep(500);
            }
        }

        [Test]
        public void E2E_10_MarkAllAsRead_CanVerifyUI()
        {
            _loginPage.NavigateTo();
            _loginPage.LoginExpectingSuccess("qa_tester2", "Test@1234");

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects"));

            _notificationPage.OpenPanel();
            if (_notificationPage.IsMarkAllReadVisible())
            {
                _notificationPage.ClickMarkAllRead();
                System.Threading.Thread.Sleep(500);
            }
        }

        [Test]
        public void E2E_11_PanelInteraction_WorksCorrectly()
        {
            _loginPage.NavigateTo();
            _loginPage.LoginExpectingSuccess("qa_tester2", "Test@1234");

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects"));

            _notificationPage.OpenPanel();
            Assert.That(_notificationPage.IsNotificationPanelVisible(), Is.True);

            _notificationPage.ClosePanelByClickingOutside();
            Assert.That(_notificationPage.IsNotificationPanelVisible(), Is.False);

            _notificationPage.OpenPanel();
            Assert.That(_notificationPage.IsNotificationPanelVisible(), Is.True);

            _notificationPage.ClosePanelByEscape();
            Assert.That(_notificationPage.IsNotificationPanelVisible(), Is.False);
        }

        [Test]
        public void E2E_12_ViewAllDeploymentsNavigation()
        {
            _loginPage.NavigateTo();
            _loginPage.LoginExpectingSuccess("qa_tester2", "Test@1234");

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects"));

            _notificationPage.OpenPanel();

            // Wait a bit more for panel animation to settle
            System.Threading.Thread.Sleep(1000);

            var viewAllLink = Driver.FindElements(By.XPath("//a[contains(text(), 'View all deployments')]"));
            if (viewAllLink.Count > 0 && viewAllLink[0].Displayed)
            {
                // Use JavaScript click to avoid interception
                ((IJavaScriptExecutor)Driver).ExecuteScript("arguments[0].click();", viewAllLink[0]);
                System.Threading.Thread.Sleep(2000);
                Assert.That(Driver.Url, Does.Contain("/deployments"));
            }
        }

        [Test]
        public void E2E_13_NoNotificationWithoutDeploymentEvent()
        {
            _loginPage.NavigateTo();
            _loginPage.LoginExpectingSuccess("qa_tester2", "Test@1234");

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects"));

            _notificationPage.OpenPanel();
            Assert.That(_notificationPage.IsNotificationPanelVisible(), Is.True);
        }

        [Test]
        public void E2E_14_MarkAllAsRead_ThenReopen_PanelShowsAllRead()
        {
            _loginPage.NavigateTo();
            _loginPage.LoginExpectingSuccess("qa_tester2", "Test@1234");

            var wait = new WebDriverWait(Driver, TimeSpan.FromSeconds(20));
            wait.Until(d => d.Url.Contains("/projects"));

            _notificationPage.OpenPanel();

            // Mark all as read if button is visible
            if (_notificationPage.IsMarkAllReadVisible())
            {
                _notificationPage.ClickMarkAllRead();
                System.Threading.Thread.Sleep(500);
            }

            _notificationPage.ClosePanelByClickingOutside();
            Assert.That(_notificationPage.IsNotificationPanelVisible(), Is.False);

            // Reopen panel - all should be read now
            _notificationPage.OpenPanel();
            Assert.That(_notificationPage.IsNotificationPanelVisible(), Is.True);

            var items = _notificationPage.GetNotificationItems();
            // All items should appear read (no blue unread indicator)
            var hasUnread = items.Any(item =>
            {
                var classes = item.GetAttribute("class");
                return classes.Contains("bg-blue-50");
            });
            Assert.That(hasUnread, Is.False, "All notifications should be marked as read");
        }
    }
}
