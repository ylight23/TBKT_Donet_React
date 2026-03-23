using protos;

namespace Backend.Services;

internal static class ThamSoResponseFactory
{
    public static ResponseMeta Ok(string message) =>
        new() { Success = true, Message = message };

    public static ResponseMeta Fail(string message, string? exception = null) =>
        new() { Success = false, Message = message, MessageException = exception ?? string.Empty };
}
