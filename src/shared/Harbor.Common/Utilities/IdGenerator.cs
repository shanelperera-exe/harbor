using System.Security.Cryptography;
using System.Text;

namespace Harbor.Common.Utilities
{
    public static class IdGenerator
    {
        private const string Chars = "abcdefghijklmnopqrstuvwxyz0123456789";

        public static string Generate(string prefix, int length = 20)
        {
            var bytes = new byte[length];
            RandomNumberGenerator.Fill(bytes);
            var sb = new StringBuilder(prefix.Length + 1 + length);
            sb.Append(prefix);
            sb.Append('-');
            for (int i = 0; i < length; i++)
            {
                sb.Append(Chars[bytes[i] % Chars.Length]);
            }
            return sb.ToString();
        }

        public static string ServiceId() => Generate("srv");
        public static string ProjectId() => Generate("prj");
        public static string EnvironmentId() => Generate("env");
        public static string DeploymentId() => Generate("dep");
        public static string UserId() => Generate("usr");
    }
}
