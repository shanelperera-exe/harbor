namespace Harbor.Common.Security;

/// <summary>Encrypts/decrypts secure values so plaintext secrets never touch the database or logs.</summary>
public interface IHarborSecretProtector
{
    string Protect(string plaintext);
    string Unprotect(string protectedValue);
}
