using System.Text;
using Harbor.Common.Utilities;
using Xunit;

namespace Harbor.GitHub.Tests
{
    public class IdGeneratorTests
    {
        // The generator only ever emits lowercase letters and digits.
        private const string AllowedChars = "abcdefghijklmnopqrstuvwxyz0123456789";

        [Fact]
        public void Generate_ProducesPrefixDashAndRequestedLength()
        {
            var id = IdGenerator.Generate("prj");

            Assert.StartsWith("prj-", id);
            Assert.Equal("prj-".Length + 20, id.Length);
        }

        [Theory]
        [InlineData(1)]
        [InlineData(5)]
        [InlineData(12)]
        [InlineData(32)]
        public void Generate_HonoursRequestedLength(int length)
        {
            var id = IdGenerator.Generate("dep", length);

            Assert.Equal("dep-".Length + length, id.Length);
        }

        [Fact]
        public void Generate_UsesDefaultLengthOfTwenty()
        {
            Assert.Equal(24, IdGenerator.Generate("usr").Length);
        }

        [Fact]
        public void Generate_OnlyEmitsAllowedCharacters()
        {
            var id = IdGenerator.Generate("srv", 200);

            var body = id["srv-".Length..];
            Assert.All(body, c => Assert.Contains(c, AllowedChars));
        }

        [Fact]
        public void Generate_ContainsNoSeparatorOrUppercaseCharacters()
        {
            var id = IdGenerator.Generate("env", 200);

            Assert.DoesNotContain('-', id["env-".Length..]);
            Assert.Equal(id.ToLowerInvariant(), id);
        }

        [Theory]
        [InlineData("prj", "prj-")]
        [InlineData("srv", "srv-")]
        [InlineData("env", "env-")]
        [InlineData("dep", "dep-")]
        [InlineData("usr", "usr-")]
        public void Generate_AppliesGivenPrefix(string prefix, string expectedPrefix)
        {
            Assert.StartsWith(expectedPrefix, IdGenerator.Generate(prefix));
        }

        [Fact]
        public void Generate_IsNotDeterministic()
        {
            var ids = Enumerable.Range(0, 100).Select(_ => IdGenerator.Generate("prj")).ToList();

            Assert.Equal(ids.Count, ids.Distinct().Count());
        }

        [Fact]
        public void Generate_RepeatedCallsProduceDifferentIds()
        {
            var first = IdGenerator.Generate("prj");
            var second = IdGenerator.Generate("prj");

            Assert.NotEqual(first, second);
        }

        // ---------- Named helpers ----------

        [Fact]
        public void ServiceId_StartsWithServicePrefixAndHasDefaultLength()
        {
            var id = IdGenerator.ServiceId();

            Assert.StartsWith("srv-", id);
            Assert.Equal(24, id.Length);
        }

        [Fact]
        public void ProjectId_StartsWithProjectPrefixAndHasDefaultLength()
        {
            var id = IdGenerator.ProjectId();

            Assert.StartsWith("prj-", id);
            Assert.Equal(24, id.Length);
        }

        [Fact]
        public void EnvironmentId_StartsWithEnvironmentPrefixAndHasDefaultLength()
        {
            var id = IdGenerator.EnvironmentId();

            Assert.StartsWith("env-", id);
            Assert.Equal(24, id.Length);
        }

        [Fact]
        public void DeploymentId_StartsWithDeploymentPrefixAndHasDefaultLength()
        {
            var id = IdGenerator.DeploymentId();

            Assert.StartsWith("dep-", id);
            Assert.Equal(24, id.Length);
        }

        [Fact]
        public void UserId_StartsWithUserPrefixAndHasDefaultLength()
        {
            var id = IdGenerator.UserId();

            Assert.StartsWith("usr-", id);
            Assert.Equal(24, id.Length);
        }

        [Fact]
        public void NamedHelpers_ProduceDistinctPrefixes()
        {
            // Prefixes must be distinguishable so a public ID always reveals its entity type.
            var ids = new[]
            {
                IdGenerator.ServiceId(),
                IdGenerator.ProjectId(),
                IdGenerator.EnvironmentId(),
                IdGenerator.DeploymentId(),
                IdGenerator.UserId()
            };

            var prefixes = ids.Select(i => i[..4]).ToList();
            Assert.Equal(prefixes.Count, prefixes.Distinct().Count());
        }

        [Fact]
        public void NamedHelpers_AreUniqueAcrossManyCalls()
        {
            var ids = Enumerable.Range(0, 500)
                .SelectMany(_ => new[]
                {
                    IdGenerator.ServiceId(),
                    IdGenerator.ProjectId(),
                    IdGenerator.EnvironmentId(),
                    IdGenerator.DeploymentId(),
                    IdGenerator.UserId()
                })
                .ToList();

            Assert.Equal(ids.Count, ids.Distinct().Count());
        }

        [Fact]
        public void Generate_EmptyPrefix_StillProducesDashAndBody()
        {
            var id = IdGenerator.Generate(string.Empty, 8);

            Assert.StartsWith("-", id);
            Assert.Equal(9, id.Length);
        }

        [Fact]
        public void Generate_ZeroLength_ProducesOnlyPrefixAndDash()
        {
            var id = IdGenerator.Generate("dep", 0);

            Assert.Equal("dep-", id);
        }

        [Fact]
        public void Generate_CoversAlphabetsAcrossManySamples()
        {
            // Guards against a modulo bias or a truncated character set regression:
            // over many samples every allowed character should appear at least once.
            var seen = new HashSet<char>();

            for (var i = 0; i < 200; i++)
                seen.UnionWith(IdGenerator.Generate("prj", 40)["prj-".Length..]);

            Assert.All(AllowedChars, c => Assert.Contains(c, seen));
        }
    }
}
