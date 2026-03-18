namespace Backend.Services;

public sealed class RebuildWorker(
    RebuildQueue          queue,
    RebuildService        rebuildService,
    ILogger<RebuildWorker> logger) : BackgroundService
{
    private readonly SemaphoreSlim _throttle = new(5);

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        var pending  = new HashSet<string>();
        var debounce = TimeSpan.FromMilliseconds(300);

        await foreach (var userId in queue.ReadAllAsync(ct))
        {
            pending.Add(userId);
            while (queue.TryDequeue(out var next))
                pending.Add(next);

            // Wait 300ms to accumulate more events before processing
            try { await Task.Delay(debounce, ct); }
            catch (OperationCanceledException) { break; }

            var batch = pending.ToArray();
            pending.Clear();

            logger.LogInformation("Rebuilding permissions for {Count} user(s)", batch.Length);

            var tasks = new List<Task>(batch.Length);
            foreach (var uid in batch)
            {
                await _throttle.WaitAsync(ct);

                tasks.Add(Task.Run(async () =>
                {
                    try
                    {
                        await rebuildService.RebuildForUser(uid);
                    }
                    catch (Exception ex)
                    {
                        logger.LogError(ex, "Rebuild failed for user {UserId}", uid);
                    }
                    finally
                    {
                        _throttle.Release();
                    }
                }, ct));
            }

            await Task.WhenAll(tasks);
        }
    }
}
