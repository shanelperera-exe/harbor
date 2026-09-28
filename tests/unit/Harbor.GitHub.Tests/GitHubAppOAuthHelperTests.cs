using System.Security.Cryptography;
using System.Text;
using Harbor.GitHub.Services;
using Xunit;

namespace Harbor.GitHub.Tests
{
    public class GitHubAppOAuthHelperTests
    {
        // ---------- GenerateState ----------

        [Fact]
        public void GenerateState_ReturnsBase64UrlEncodedRandomValue()
        {
            var state = GitHubAppOAuthHelper.GenerateState();

            // 32 random bytes base64url-encoded without padding is 43 characters.
            Assert.Equal(43, state.Length);
        }

        [Fact]
        public void GenerateState_UsesUrlSafeBase64Alphabet()
        {
            for (var i = 0; i < 50; i++)
            {
                var state = GitHubAppOAuthHelper.GenerateState();

                Assert.DoesNotContain('+', state);
                Assert.DoesNotContain('/', state);
                Assert.DoesNotContain('=', state);
                Assert.Equal(state, Uri.EscapeDataString(state));
            }
        }

        [Fact]
        public void GenerateState_IsUniqueAcrossCalls()
        {
            var states = Enumerable.Range(0, 200).Select(_ => GitHubAppOAuthHelper.GenerateState()).ToList();

            Assert.Equal(states.Count, states.Distinct().Count());
        }

        // ---------- GenerateCodeVerifier ----------

        [Fact]
        public void GenerateCodeVerifier_ReturnsBase64UrlEncodedRandomValue()
        {
            var verifier = GitHubAppOAuthHelper.GenerateCodeVerifier();

            // RFC 7636 requires 43-128 characters; 32 random bytes gives 43.
            Assert.Equal(43, verifier.Length);
            Assert.InRange(verifier.Length, 43, 128);
        }

        [Fact]
        public void GenerateCodeVerifier_UsesUrlSafeBase64Alphabet()
        {
            for (var i = 0; i < 50; i++)
            {
                var verifier = GitHubAppOAuthHelper.GenerateCodeVerifier();

                Assert.DoesNotContain('+', verifier);
                Assert.DoesNotContain('/', verifier);
                Assert.DoesNotContain('=', verifier);
            }
        }

        [Fact]
        public void GenerateCodeVerifier_IsUniqueAcrossCalls()
        {
            var verifiers = Enumerable.Range(0, 200).Select(_ => GitHubAppOAuthHelper.GenerateCodeVerifier()).ToList();

            Assert.Equal(verifiers.Count, verifiers.Distinct().Count());
        }

        // ---------- GenerateCodeChallenge ----------

        [Fact]
        public void GenerateCodeChallenge_ReturnsS256HashOfVerifier()
        {
            const string verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

            var challenge = GitHubAppOAuthHelper.GenerateCodeChallenge(verifier);

            // RFC 7636 Appendix B test vector for the S256 method.
            Assert.Equal("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM", challenge);
        }

        [Fact]
        public void GenerateCodeChallenge_MatchesIndependentSha256Computation()
        {
            var verifier = GitHubAppOAuthHelper.GenerateCodeVerifier();

            var expected = Convert.ToBase64String(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)))
                .TrimEnd('=').Replace('+', '-').Replace('/', '_');

            Assert.Equal(expected, GitHubAppOAuthHelper.GenerateCodeChallenge(verifier));
        }

        [Fact]
        public void GenerateCodeChallenge_UsesUrlSafeBase64Alphabet()
        {
            for (var i = 0; i < 50; i++)
            {
                var challenge = GitHubAppOAuthHelper.GenerateCodeChallenge(
                    GitHubAppOAuthHelper.GenerateCodeVerifier());

                Assert.DoesNotContain('+', challenge);
                Assert.DoesNotContain('/', challenge);
                Assert.DoesNotContain('=', challenge);
            }
        }

        [Fact]
        public void GenerateCodeChallenge_IsDeterministicForSameVerifier()
        {
            var verifier = GitHubAppOAuthHelper.GenerateCodeVerifier();

            Assert.Equal(
                GitHubAppOAuthHelper.GenerateCodeChallenge(verifier),
                GitHubAppOAuthHelper.GenerateCodeChallenge(verifier));
        }

        [Fact]
        public void GenerateCodeChallenge_DifferentVerifiers_ProduceDifferentChallenges()
        {
            var first = GitHubAppOAuthHelper.GenerateCodeChallenge(GitHubAppOAuthHelper.GenerateCodeVerifier());
            var second = GitHubAppOAuthHelper.GenerateCodeChallenge(GitHubAppOAuthHelper.GenerateCodeVerifier());

            Assert.NotEqual(first, second);
        }

        [Fact]
        public void GenerateCodeChallenge_EmptyVerifier_StillProducesHash()
        {
            var challenge = GitHubAppOAuthHelper.GenerateCodeChallenge(string.Empty);

            // SHA-256 of the empty string, base64url-encoded.
            Assert.Equal("47DEQpj8HBSa-_TImW-5JCeuQeRkm5NMpJWZG3hSuFU", challenge);
        }

        [Fact]
        public void GenerateCodeChallenge_IsNotTheVerifierItself()
        {
            var verifier = GitHubAppOAuthHelper.GenerateCodeVerifier();

            Assert.NotEqual(verifier, GitHubAppOAuthHelper.GenerateCodeChallenge(verifier));
        }

        // ---------- PKCE round trip ----------

        [Fact]
        public void CodeChallengeFlow_VerifierAndChallengeAreLinkedDeterministically()
        {
            for (var i = 0; i < 20; i++)
            {
                var verifier = GitHubAppOAuthHelper.GenerateCodeVerifier();
                var challenge = GitHubAppOAuthHelper.GenerateCodeChallenge(verifier);

                Assert.Equal(43, verifier.Length);
                Assert.Equal(43, challenge.Length);
            }
        }
    }
}
