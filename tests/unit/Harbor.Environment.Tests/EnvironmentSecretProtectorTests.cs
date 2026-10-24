using System.Security.Cryptography;
using System.Text;
using Harbor.Common.Security;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Harbor.Environment.Tests
{
    /// <summary>
    /// The secret protector is the component that guards environment configuration
    /// values (DB passwords, API keys) at rest, so these tests cover the round trip,
    /// the key-validation failure modes, and the authenticated-encryption guarantees.
    /// </summary>
    public class EnvironmentSecretProtectorTests : IDisposable
    {
        private const string ConfigKeyName = "ENVIRONMENT_SECRETS_KEY";
        private readonly string? _originalEnvValue;

        public EnvironmentSecretProtectorTests()
        {
            // Snapshot the ambient value so constructor tests can safely fall back to it
            // and restore it, rather than leaking one test's key into another.
            _originalEnvValue = System.Environment.GetEnvironmentVariable(ConfigKeyName);
        }

        public void Dispose()
        {
            System.Environment.SetEnvironmentVariable(ConfigKeyName, _originalEnvValue);
        }

        private static void SetKeyForTest(byte[]? keyBytes = null)
        {
            var key = keyBytes ?? RandomNumberGenerator.GetBytes(32);
            System.Environment.SetEnvironmentVariable(ConfigKeyName, Convert.ToBase64String(key));
        }

        // ---------- Round trip ----------

        [Fact]
        public void ProtectThenUnprotect_RestoresOriginalPlaintext()
        {
            SetKeyForTest();
            var protector = new HarborSecretProtector();

            const string secret = "super-secret-database-password";

            var protectedValue = protector.Protect(secret);
            var restored = protector.Unprotect(protectedValue);

            Assert.Equal(secret, restored);
        }

        [Theory]
        [InlineData("")]
        [InlineData(" ")]
        [InlineData("a")]
        [InlineData("value with spaces and symbols !@#$%^&*()")]
        [InlineData("multi\nline\r\nvalue")]
        [InlineData("unicode: héllo wörld 日本語 🚀")]
        public void ProtectThenUnprotect_RestoresValueOfAnyShape(string plaintext)
        {
            SetKeyForTest();
            var protector = new HarborSecretProtector();

            Assert.Equal(plaintext, protector.Unprotect(protector.Protect(plaintext)));
        }

        [Fact]
        public void Protect_ProducesBase64Output()
        {
            SetKeyForTest();
            var protector = new HarborSecretProtector();

            var protectedValue = protector.Protect("secret");

            // Round-trips through base64 decoding without throwing.
            var bytes = Convert.FromBase64String(protectedValue);
            Assert.NotEmpty(bytes);
        }

        [Fact]
        public void Protect_IncludesNonceAndAuthenticationTag()
        {
            SetKeyForTest();
            var protector = new HarborSecretProtector();
            const string secret = "abcdefghijklmnopqrstuvwxyz";

            var combined = Convert.FromBase64String(protector.Protect(secret));

            // Layout is nonce (12) || tag (16) || ciphertext
            Assert.Equal(12 + 16 + secret.Length, combined.Length);
        }

        // ---------- Non-determinism ----------

        [Fact]
        public void Protect_SameInputTwice_ProducesDifferentCiphertexts()
        {
            // A fresh random nonce per call means encrypting identical plaintext must not
            // produce identical output, otherwise stored secrets would be comparable.
            SetKeyForTest();
            var protector = new HarborSecretProtector();

            var first = protector.Protect("same-secret");
            var second = protector.Protect("same-secret");

            Assert.NotEqual(first, second);
            Assert.Equal("same-secret", protector.Unprotect(first));
            Assert.Equal("same-secret", protector.Unprotect(second));
        }

        [Fact]
        public void Protect_AcrossManyCalls_AllValuesUnprotectCorrectly()
        {
            SetKeyForTest();
            var protector = new HarborSecretProtector();

            for (var i = 0; i < 50; i++)
            {
                var plaintext = $"secret-{i}";
                Assert.Equal(plaintext, protector.Unprotect(protector.Protect(plaintext)));
            }
        }

        // ---------- Tamper detection ----------

        [Fact]
        public void Unprotect_TamperedCiphertext_ThrowsAuthenticationTagMismatch()
        {
            SetKeyForTest();
            var protector = new HarborSecretProtector();
            var combined = Convert.FromBase64String(protector.Protect("secret-value"));

            // Flip a bit in the final ciphertext byte.
            combined[^1] ^= 0xFF;

            Assert.Throws<AuthenticationTagMismatchException>(
                () => protector.Unprotect(Convert.ToBase64String(combined)));
        }

        [Fact]
        public void Unprotect_TamperedNonce_ThrowsAuthenticationTagMismatch()
        {
            SetKeyForTest();
            var protector = new HarborSecretProtector();
            var combined = Convert.FromBase64String(protector.Protect("secret-value"));

            combined[0] ^= 0xFF; // first byte of the nonce

            Assert.Throws<AuthenticationTagMismatchException>(
                () => protector.Unprotect(Convert.ToBase64String(combined)));
        }

        [Fact]
        public void Unprotect_TamperedTag_ThrowsAuthenticationTagMismatch()
        {
            SetKeyForTest();
            var protector = new HarborSecretProtector();
            var combined = Convert.FromBase64String(protector.Protect("secret-value"));

            combined[13] ^= 0xFF; // inside the 16-byte authentication tag

            Assert.Throws<AuthenticationTagMismatchException>(
                () => protector.Unprotect(Convert.ToBase64String(combined)));
        }

        [Fact]
        public void Unprotect_TruncatedPayload_Throws()
        {
            SetKeyForTest();
            var protector = new HarborSecretProtector();
            var combined = Convert.FromBase64String(protector.Protect("secret-value"));

            // Shorter than nonce + tag, so the slices cannot be formed.
            var truncated = combined[..10];

            Assert.ThrowsAny<Exception>(() => protector.Unprotect(Convert.ToBase64String(truncated)));
        }

        [Fact]
        public void Unprotect_NonBase64Input_ThrowsFormatException()
        {
            SetKeyForTest();
            var protector = new HarborSecretProtector();

            Assert.Throws<FormatException>(() => protector.Unprotect("this is not base64!!"));
        }

        // ---------- Cross-key isolation ----------

        [Fact]
        public void Unprotect_WithDifferentKey_ThrowsAuthenticationTagMismatch()
        {
            SetKeyForTest();
            var encryptor = new HarborSecretProtector();

            // Change key for decryptor
            var newKey = RandomNumberGenerator.GetBytes(32);
            System.Environment.SetEnvironmentVariable(ConfigKeyName, Convert.ToBase64String(newKey));
            var decryptor = new HarborSecretProtector();

            var protectedValue = encryptor.Protect("secret-value");

            // A different key must not be able to decrypt the value.
            Assert.Throws<AuthenticationTagMismatchException>(() => decryptor.Unprotect(protectedValue));
        }

        [Fact]
        public void InstancesSharingSameKey_CanDecryptEachOthersValues()
        {
            SetKeyForTest();
            var first = new HarborSecretProtector();
            var second = new HarborSecretProtector();

            Assert.Equal("shared-secret", second.Unprotect(first.Protect("shared-secret")));
        }

        // ---------- Key configuration failures ----------

        [Fact]
        public void Constructor_MissingKey_ThrowsInvalidOperationException()
        {
            System.Environment.SetEnvironmentVariable(ConfigKeyName, null);
            var ex = Assert.Throws<InvalidOperationException>(() => new HarborSecretProtector());

            Assert.Contains(ConfigKeyName, ex.Message);
        }

        [Fact]
        public void Constructor_NonBase64Key_ThrowsInvalidOperationException()
        {
            System.Environment.SetEnvironmentVariable(ConfigKeyName, "not-valid-base64-!!!");
            var ex = Assert.Throws<InvalidOperationException>(() => new HarborSecretProtector());

            Assert.Contains("base64", ex.Message);
        }

        [Theory]
        [InlineData(16)]
        [InlineData(24)]
        [InlineData(31)]
        [InlineData(33)]
        [InlineData(64)]
        public void Constructor_KeyNotThirtyTwoBytes_ThrowsInvalidOperationException(int keyLength)
        {
            System.Environment.SetEnvironmentVariable(ConfigKeyName, Convert.ToBase64String(RandomNumberGenerator.GetBytes(keyLength)));
            var ex = Assert.Throws<InvalidOperationException>(() => new HarborSecretProtector());

            Assert.Contains("32 bytes", ex.Message);
        }

        [Fact]
        public void Constructor_ReadsKeyFromEnvironmentVariable()
        {
            var key = RandomNumberGenerator.GetBytes(32);
            System.Environment.SetEnvironmentVariable(ConfigKeyName, Convert.ToBase64String(key));

            var protector = new HarborSecretProtector();

            Assert.Equal("env-secret", protector.Unprotect(protector.Protect("env-secret")));
        }

        [Fact]
        public void Constructor_DifferentEnvironmentKeys_CannotDecryptEachOthersValues()
        {
            // Set first key and encrypt
            var key1 = RandomNumberGenerator.GetBytes(32);
            System.Environment.SetEnvironmentVariable(ConfigKeyName, Convert.ToBase64String(key1));
            var protector1 = new HarborSecretProtector();
            var protectedValue = protector1.Protect("secret");

            // Change to different key and try to decrypt
            var key2 = RandomNumberGenerator.GetBytes(32);
            System.Environment.SetEnvironmentVariable(ConfigKeyName, Convert.ToBase64String(key2));
            var protector2 = new HarborSecretProtector();

            Assert.Throws<AuthenticationTagMismatchException>(() => protector2.Unprotect(protectedValue));
        }
    }
}
