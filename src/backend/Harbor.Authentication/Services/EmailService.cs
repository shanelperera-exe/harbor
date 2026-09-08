using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using MimeKit.Text;

namespace Harbor.Authentication.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
        {
            var host = Environment.GetEnvironmentVariable("SMTP_HOST") ?? _config["Smtp:Host"];
            var portString = Environment.GetEnvironmentVariable("SMTP_PORT") ?? _config["Smtp:Port"];
            var port = int.Parse(portString ?? "587");
            var username = Environment.GetEnvironmentVariable("SMTP_USERNAME") ?? _config["Smtp:Username"];
            var password = Environment.GetEnvironmentVariable("SMTP_PASSWORD") ?? _config["Smtp:Password"];
            var fromName = Environment.GetEnvironmentVariable("SMTP_FROM_NAME") ?? _config["Smtp:FromName"] ?? "Harbor Team";
            var fromEmail = Environment.GetEnvironmentVariable("SMTP_FROM_EMAIL") ?? _config["Smtp:FromEmail"] ?? "noreply@harbor.com";
            
            var maskedEmail = MaskEmail(toEmail);

            if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(username) || string.IsNullOrEmpty(password))
            {
                _logger.LogWarning("SMTP is not configured properly in appsettings.json. Skipping email send to {toEmail}", maskedEmail);
                return;
            }

            var message = new MimeMessage();
            message.From.Add(new MailboxAddress(fromName, fromEmail));
            message.To.Add(new MailboxAddress("", toEmail));
            message.Subject = subject;

            message.Body = new TextPart(TextFormat.Html)
            {
                Text = htmlBody
            };

            using var client = new SmtpClient();
            try
            {
                await client.ConnectAsync(host, port, SecureSocketOptions.StartTls);
                await client.AuthenticateAsync(username, password);
                await client.SendAsync(message);
                await client.DisconnectAsync(true);
                
                _logger.LogInformation("Email sent successfully to {toEmail}", maskedEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email to {toEmail}", maskedEmail);
            }
        }

        private static string MaskEmail(string email)
        {
            if (string.IsNullOrEmpty(email) || !email.Contains('@'))
                return "***";

            var parts = email.Split('@');
            var name = parts[0];
            var domain = parts[1];

            if (name.Length <= 2)
                return $"***@{domain}";

            return $"{name[0]}***{name[^1]}@{domain}";
        }
    }
}
