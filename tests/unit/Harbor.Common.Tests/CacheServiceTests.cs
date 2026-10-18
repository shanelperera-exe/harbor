using System.Text;
using System.Text.Json;
using Harbor.Caching;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Harbor.Common.Tests;

public class CacheServiceTests
{
    private readonly Mock<IDistributedCache> _cacheMock;
    private readonly Mock<ILogger<CacheService>> _loggerMock;
    private readonly CacheService _sut;

    public CacheServiceTests()
    {
        _cacheMock = new Mock<IDistributedCache>();
        _loggerMock = new Mock<ILogger<CacheService>>();
        _sut = new CacheService(_cacheMock.Object, _loggerMock.Object);
    }

    [Fact]
    public async Task GetAsync_WhenKeyExists_ReturnsDeserializedObject()
    {
        var expected = new TestModel { Id = 42, Name = "Harbor" };
        var jsonBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(expected));
        _cacheMock.Setup(c => c.GetAsync("key1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(jsonBytes);

        var result = await _sut.GetAsync<TestModel>("key1");

        Assert.NotNull(result);
        Assert.Equal(expected.Id, result.Id);
        Assert.Equal(expected.Name, result.Name);
    }

    [Fact]
    public async Task GetAsync_WhenKeyDoesNotExist_ReturnsDefault()
    {
        _cacheMock.Setup(c => c.GetAsync("missing_key", It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        var result = await _sut.GetAsync<TestModel>("missing_key");

        Assert.Null(result);
    }

    [Fact]
    public async Task GetAsync_WhenCacheThrows_ReturnsDefaultAndDoesNotThrow()
    {
        _cacheMock.Setup(c => c.GetAsync("error_key", It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Redis down"));

        var result = await _sut.GetAsync<TestModel>("error_key");

        Assert.Null(result);
    }

    [Fact]
    public async Task SetAsync_WithTtl_SetsStringWithOptions()
    {
        var model = new TestModel { Id = 1, Name = "Item" };
        var ttl = TimeSpan.FromMinutes(10);

        await _sut.SetAsync("key2", model, ttl);

        _cacheMock.Verify(c => c.SetAsync(
            "key2",
            It.IsAny<byte[]>(),
            It.Is<DistributedCacheEntryOptions>(o => o.AbsoluteExpirationRelativeToNow == ttl),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SetAsync_WithoutTtl_SetsStringWithoutExpiration()
    {
        var model = new TestModel { Id = 2, Name = "NoTtl" };

        await _sut.SetAsync("key3", model);

        _cacheMock.Verify(c => c.SetAsync(
            "key3",
            It.IsAny<byte[]>(),
            It.Is<DistributedCacheEntryOptions>(o => o.AbsoluteExpirationRelativeToNow == null),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SetAsync_WhenCacheThrows_DoesNotPropagateException()
    {
        _cacheMock.Setup(c => c.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(), It.IsAny<DistributedCacheEntryOptions>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Write failure"));

        var ex = await Record.ExceptionAsync(() => _sut.SetAsync("fail_key", new TestModel()));

        Assert.Null(ex);
    }

    [Fact]
    public async Task RemoveAsync_CallsCacheRemove()
    {
        await _sut.RemoveAsync("rem_key");

        _cacheMock.Verify(c => c.RemoveAsync("rem_key", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RemoveAsync_WhenCacheThrows_DoesNotPropagateException()
    {
        _cacheMock.Setup(c => c.RemoveAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Remove failed"));

        var ex = await Record.ExceptionAsync(() => _sut.RemoveAsync("fail_rem"));

        Assert.Null(ex);
    }

    [Fact]
    public async Task GetOrSetAsync_WhenCached_ReturnsCachedWithoutCallingFactory()
    {
        var cached = new TestModel { Id = 100, Name = "Cached" };
        var jsonBytes = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(cached));
        _cacheMock.Setup(c => c.GetAsync("cached_key", It.IsAny<CancellationToken>()))
            .ReturnsAsync(jsonBytes);

        var factoryCalled = false;
        var result = await _sut.GetOrSetAsync("cached_key", () =>
        {
            factoryCalled = true;
            return Task.FromResult<TestModel?>(new TestModel { Id = 999 });
        });

        Assert.NotNull(result);
        Assert.Equal(100, result.Id);
        Assert.False(factoryCalled);
    }

    [Fact]
    public async Task GetOrSetAsync_WhenNotCached_CallsFactoryAndSetsCache()
    {
        _cacheMock.Setup(c => c.GetAsync("new_key", It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        var fresh = new TestModel { Id = 200, Name = "Fresh" };
        var result = await _sut.GetOrSetAsync("new_key", () => Task.FromResult<TestModel?>(fresh), TimeSpan.FromMinutes(5));

        Assert.NotNull(result);
        Assert.Equal(200, result.Id);
        _cacheMock.Verify(c => c.SetAsync("new_key", It.IsAny<byte[]>(), It.IsAny<DistributedCacheEntryOptions>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetOrSetAsync_WhenFactoryReturnsNull_DoesNotSetCache()
    {
        _cacheMock.Setup(c => c.GetAsync("null_key", It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        var result = await _sut.GetOrSetAsync<TestModel>("null_key", () => Task.FromResult<TestModel?>(null));

        Assert.Null(result);
        _cacheMock.Verify(c => c.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(), It.IsAny<DistributedCacheEntryOptions>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private sealed class TestModel
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }
}
