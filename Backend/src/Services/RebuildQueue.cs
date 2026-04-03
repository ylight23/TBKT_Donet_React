using System.Threading.Channels;

namespace Backend.Services;

public sealed class RebuildQueue
{
    // Bounded: max 10_000 jobs, prevent OOM when flooded
    private readonly Channel<string> _channel =
        Channel.CreateBounded<string>(new BoundedChannelOptions(10_000)
        {
            FullMode     = BoundedChannelFullMode.DropOldest,
            SingleReader = true,
        });

    /// <summary>Enqueue a userId for rebuild — non-blocking, O(1)</summary>
    public void Enqueue(string userId) =>
        _channel.Writer.TryWrite(userId);

    /// <summary>Enqueue all members of a group for rebuild</summary>
    public void EnqueueGroup(IEnumerable<string> userIds)
    {
        foreach (var uid in userIds)
            _channel.Writer.TryWrite(uid);
    }

    public IAsyncEnumerable<string> ReadAllAsync(CancellationToken ct) =>
        _channel.Reader.ReadAllAsync(ct);

    public bool TryDequeue(out string userId)
    {
        if (_channel.Reader.TryRead(out var id))
        {
            userId = id;
            return true;
        }
        userId = "";
        return false;
    }
}
