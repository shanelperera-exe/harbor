namespace Harbor.Environment.Security;

/// <summary>Encrypts/decrypts secure environment values so plaintext secrets never touch the database or logs.</summary>
public interface IEnvironmentSecretProtector
{
    string Protect(string plaintext);
    string Unprotect(string protectedValue);
}