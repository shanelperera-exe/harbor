using System.Security.Cryptography;
using System.Text;

namespace Harbor.Environment.Security;

/// <summary>
/// AES-256-GCM secret protector. The key comes only from configuration/environment variables
/// (see ENVIRONMENT_SECRETS_KEY in .env) — it is never hard-coded, never logged, and never
/// returned from any endpoint.
/// </summary>
public class EnvironmentSecretProtector : IEnvironmentSecretProtector
{
    private const int NonceSize = 12; // 96-bit nonce, standard for AES-GCM
    private const int TagSize = 16;   // 128-bit authentication tag

    private readonly byte[] _key;

    public EnvironmentSecretProtector(IConfiguration configuration)
    {
        var keyValue = configuration["ENVIRONMENT_SECRETS_KEY"]
            ?? System.Environment.GetEnvironmentVariable("ENVIRONMENT_SECRETS_KEY")
            ?? throw new InvalidOperationException("ENVIRONMENT_SECRETS_KEY is not configured.");

        try
        {
            _key = Convert.FromBase64String(keyValue);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException("ENVIRONMENT_SECRETS_KEY must be a base64-encoded value.");
        }

        if (_key.Length != 32)
            throw new InvalidOperationException("ENVIRONMENT_SECRETS_KEY must decode to 32 bytes (AES-256).");
    }

    public string Protect(string plaintext)
    {
        var plainBytes = Encoding.UTF8.GetBytes(plaintext);
        var nonce = RandomNumberGenerator.GetBytes(NonceSize);
        var cipherBytes = new byte[plainBytes.Length];
        var tag = new byte[TagSize];

        using var aesGcm = new AesGcm(_key, TagSize);
        aesGcm.Encrypt(nonce, plainBytes, cipherBytes, tag);

        // Layout: nonce || tag || ciphertext, all base64-encoded together.
        var combined = new byte[NonceSize + TagSize + cipherBytes.Length];
        Buffer.BlockCopy(nonce, 0, combined, 0, NonceSize);
        Buffer.BlockCopy(tag, 0, combined, NonceSize, TagSize);
        Buffer.BlockCopy(cipherBytes, 0, combined, NonceSize + TagSize, cipherBytes.Length);
        return Convert.ToBase64String(combined);
    }

    public string Unprotect(string protectedValue)
    {
        var combined = Convert.FromBase64String(protectedValue);
        var nonce = combined[..NonceSize];
        var tag = combined[NonceSize..(NonceSize + TagSize)];
        var cipherBytes = combined[(NonceSize + TagSize)..];
        var plainBytes = new byte[cipherBytes.Length];

        using var aesGcm = new AesGcm(_key, TagSize);
        aesGcm.Decrypt(nonce, cipherBytes, tag, plainBytes);
        return Encoding.UTF8.GetString(plainBytes);
    }
}