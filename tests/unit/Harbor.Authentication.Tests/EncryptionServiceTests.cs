using System.Security.Cryptography;
using Harbor.Authentication.Services;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Harbor.Authentication.Tests
{
    /// <summary>
    /// Covers the AES-CBC helper used to store GitHub tokens at rest, including the
    /// IV handling and the key-configuration failure modes.
    /// </summary>
    public class EncryptionServiceTests : IDisposable
    {
        private const string ConfigKeyName = "ENVIRONMENT_SECRETS_KEY";
        private readonly string? _originalEnvValue;

        public EncryptionServiceTests()
        {
            _originalEnvValue = System.Environment.GetEnvironmentVariable(ConfigKeyName);
        }

        public void Dispose()
        {
            System.Environment.SetEnvironmentVariable(ConfigKeyName, _originalEnvValue);
        }

        private static IConfiguration ConfigurationWithKey(byte[]? keyBytes = null)
        {
            var key = keyBytes ?? RandomNumberGenerator.GetBytes(32);
            return new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    [ConfigKeyName] = Convert.ToBase64String(key)
                })
                .Build();
        }

        // ---------- Round trip ----------

        [Fact]
        public void EncryptThenDecrypt_RestoresOriginalPlaintext()
        {
            var service = new EncryptionService(ConfigurationWithKey());

            const string token = "gho_16C7e42F292c6912E7710c838347Ae178B4a";

            Assert.Equal(token, service.Decrypt(service.Encrypt(token)));
        }

        [Theory]
        [InlineData("")]
        [InlineData("a")]
        [InlineData("short-token")]
        [InlineData("token with spaces and !@#$%^&* symbols")]
        [InlineData("unicode: héllo wörld 日本語 🚀")]
        public void EncryptThenDecrypt_RestoresValueOfAnyShape(string plaintext)
        {
            var service = new EncryptionService(ConfigurationWithKey());

            Assert.Equal(plaintext, service.Decrypt(service.Encrypt(plaintext)));
        }

        // ---------- Empty input short-circuits ----------

        [Theory]
        [InlineData("")]
        public void Encrypt_EmptyInput_ReturnsEmptyString(string plaintext)
        {
            var service = new EncryptionService(ConfigurationWithKey());

            Assert.Equal(string.Empty, service.Encrypt(plaintext));
        }

        [Theory]
        [InlineData("")]
        public void Decrypt_EmptyInput_ReturnsEmptyString(string ciphertext)
        {
            var service = new EncryptionService(ConfigurationWithKey());

            Assert.Equal(string.Empty, service.Decrypt(ciphertext));
        }

        [Fact]
        public void Encrypt_NullInput_ReturnsEmptyString()
        {
            var service = new EncryptionService(ConfigurationWithKey());

            Assert.Equal(string.Empty, service.Encrypt(null!));
        }

        [Fact]
        public void Decrypt_NullInput_ReturnsEmptyString()
        {
            var service = new EncryptionService(ConfigurationWithKey());

            Assert.Equal(string.Empty, service.Decrypt(null!));
        }

        // ---------- IV handling ----------

        [Fact]
        public void Encrypt_SameInputTwice_ProducesDifferentCiphertexts()
        {
            // A fresh IV per call must be generated; otherwise identical tokens would
            // produce identical ciphertext, leaking that they are the same token.
            var service = new EncryptionService(ConfigurationWithKey());

            var first = service.Encrypt("same-token");
            var second = service.Encrypt("same-token");

            Assert.NotEqual(first, second);
            Assert.Equal("same-token", service.Decrypt(first));
            Assert.Equal("same-token", service.Decrypt(second));
        }

        [Fact]
        public void Encrypt_PrependsIvToCiphertext()
        {
            var service = new EncryptionService(ConfigurationWithKey());

            var combined = Convert.FromBase64String(service.Encrypt("12345678"));

            // AES-CBC IV is 16 bytes and is stored ahead of the ciphertext.
            Assert.True(combined.Length > 16);
            Assert.Equal("12345678", service.Decrypt(Convert.ToBase64String(combined)));
        }

        [Fact]
        public void Encrypt_AcrossManyCalls_AllValuesDecryptCorrectly()
        {
            var service = new EncryptionService(ConfigurationWithKey());

            for (var i = 0; i < 50; i++)
            {
                var plaintext = $"token-{i}";
                Assert.Equal(plaintext, service.Decrypt(service.Encrypt(plaintext)));
            }
        }

        [Fact]
        public void Decrypt_AcrossDifferentServiceInstancesSharingKey_Works()
        {
            var key = RandomNumberGenerator.GetBytes(32);
            var encryptor = new EncryptionService(ConfigurationWithKey(key));
            var decryptor = new EncryptionService(ConfigurationWithKey(key));

            Assert.Equal("shared-token", decryptor.Decrypt(encryptor.Encrypt("shared-token")));
        }

        // ---------- Tampering / wrong key ----------

        [Fact]
        public void Decrypt_WithDifferentKey_ThrowsCryptographicException()
        {
            var encryptor = new EncryptionService(ConfigurationWithKey());
            var decryptor = new EncryptionService(ConfigurationWithKey());

            var ciphertext = encryptor.Encrypt("secret-token");

            // CBC with PKCS7 has no authentication tag, so a wrong key typically surfaces
            // as a padding error rather than returning garbage silently.
            Assert.Throws<CryptographicException>(() => decryptor.Decrypt(ciphertext));
        }

        [Fact]
        public void Decrypt_TamperedCiphertext_ThrowsPaddingError()
        {
            var service = new EncryptionService(ConfigurationWithKey());
            var combined = Convert.FromBase64String(service.Encrypt("secret-token"));

            combined[^1] ^= 0xFF;

            // AES-CBC with PKCS7 padding is unauthenticated, so corruption is only caught
            // here because the padding check fails. It must never silently return the
            // original plaintext.
            Assert.Throws<CryptographicException>(
                () => service.Decrypt(Convert.ToBase64String(combined)));
        }

        [Fact]
        public void Decrypt_NonBase64Input_ThrowsFormatException()
        {
            var service = new EncryptionService(ConfigurationWithKey());

            Assert.Throws<FormatException>(() => service.Decrypt("this is not base64!!"));
        }

        [Fact]
        public void Decrypt_TooShortToContainIv_Throws()
        {
            var service = new EncryptionService(ConfigurationWithKey());

            Assert.ThrowsAny<Exception>(
                () => service.Decrypt(Convert.ToBase64String(new byte[8])));
        }

        // ---------- Key configuration failures ----------

        [Fact]
        public void Constructor_MissingKey_ThrowsInvalidOperationException()
        {
            System.Environment.SetEnvironmentVariable(ConfigKeyName, null);
            var configuration = new ConfigurationBuilder().Build();

            var ex = Assert.Throws<InvalidOperationException>(() => new EncryptionService(configuration));

            Assert.Contains(ConfigKeyName, ex.Message);
        }

        [Fact]
        public void Constructor_NonBase64Key_ThrowsFormatException()
        {
            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    [ConfigKeyName] = "not-valid-base64-!!!"
                })
                .Build();

            Assert.Throws<FormatException>(() => new EncryptionService(configuration));
        }

        [Theory]
        [InlineData(16)]
        [InlineData(24)]
        [InlineData(31)]
        [InlineData(33)]
        public void Constructor_KeyNotThirtyTwoBytes_ThrowsInvalidOperationException(int keyLength)
        {
            var configuration = ConfigurationWithKey(RandomNumberGenerator.GetBytes(keyLength));

            var ex = Assert.Throws<InvalidOperationException>(() => new EncryptionService(configuration));

            Assert.Contains("32-byte", ex.Message);
        }

        [Fact]
        public void Constructor_FallsBackToProcessEnvironmentVariable_WhenConfigMissing()
        {
            var key = RandomNumberGenerator.GetBytes(32);
            System.Environment.SetEnvironmentVariable(ConfigKeyName, Convert.ToBase64String(key));

            var service = new EncryptionService(new ConfigurationBuilder().Build());

            Assert.Equal("env-token", service.Decrypt(service.Encrypt("env-token")));
        }
    }
}
