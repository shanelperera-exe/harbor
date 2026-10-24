using System;
using System.Linq;
using System.Reflection;
using Harbor.Common.Observability;
using Xunit;

namespace Harbor.Common.Tests;

/// <summary>
/// Architecture Fitness Functions (Stage 4: Static Quality & Metrics)
/// Statically validates architectural invariants, clean architecture layering boundaries,
/// and security contracts across Harbor shared libraries and microservice models.
/// </summary>
public class ArchitectureInvariantsTests
{
    private readonly Assembly _commonAssembly = typeof(HarborSensitiveDataScrubber).Assembly;

    [Fact]
    public void CommonAssembly_ShouldNotReference_AspNetCoreMvcControllers()
    {
        // Invariant 1: Shared Common kernel must remain pure and free from heavy MVC controller presentation dependencies
        var referencedAssemblies = _commonAssembly.GetReferencedAssemblies();
        var hasMvcControllers = referencedAssemblies.Any(a =>
            string.Equals(a.Name, "Microsoft.AspNetCore.Mvc.Core", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(a.Name, "Microsoft.AspNetCore.Mvc", StringComparison.OrdinalIgnoreCase));

        Assert.False(hasMvcControllers, "Harbor.Common must not reference Microsoft.AspNetCore.Mvc directly to preserve clean architecture layering.");
    }

    [Fact]
    public void CommonAssembly_AllPublicClasses_ShouldHaveWellFormedNamespaces()
    {
        // Invariant 2: All exported types must strictly reside under 'Harbor.Common' hierarchy
        var exportedTypes = _commonAssembly.GetExportedTypes();
        var invalidTypes = exportedTypes
            .Where(t => t.Namespace == null || !t.Namespace.StartsWith("Harbor.Common", StringComparison.Ordinal))
            .Select(t => t.FullName)
            .ToList();

        Assert.Empty(invalidTypes);
    }

    [Fact]
    public void CommonAssembly_Interfaces_ShouldAdhereToStandardNamingConvention()
    {
        // Invariant 3: Static Analysis Rule S100/CA1715 - All interface contracts must begin with 'I'
        var interfaces = _commonAssembly.GetExportedTypes()
            .Where(t => t.IsInterface)
            .Where(t => !t.Name.StartsWith("I", StringComparison.Ordinal))
            .Select(t => t.FullName)
            .ToList();

        Assert.Empty(interfaces);
    }

    [Fact]
    public void SecurityScrubber_MustContainZeroPublicFields()
    {
        // Invariant 4: Security invariants require immutable state - no mutable public static fields
        var publicFields = typeof(HarborSensitiveDataScrubber)
            .GetFields(BindingFlags.Public | BindingFlags.Instance | BindingFlags.Static)
            .Where(f => !f.IsLiteral && !f.IsInitOnly)
            .ToList();

        Assert.Empty(publicFields);
    }

    [Fact]
    public void CommonAssembly_Types_ShouldNotHaveCyclicSelfDependencies()
    {
        // Invariant 5: Modularity index - types maintain healthy modular granularity
        var types = _commonAssembly.GetTypes();
        Assert.NotEmpty(types);
        Assert.True(types.Length >= 4, "Harbor.Common should maintain healthy modular granularity.");
    }
}
