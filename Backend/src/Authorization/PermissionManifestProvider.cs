using System.Text.Json;

namespace Backend.Authorization;

internal sealed class PermissionManifest
{
    public List<PermissionManifestGroup> PermissionGroups { get; init; } = [];
    public List<PermissionManifestMenuItem> StaticMenus { get; init; } = [];
}

internal sealed class PermissionManifestGroup
{
    public string Group { get; init; } = "";
    public string Icon { get; init; } = "";
    public int Order { get; init; }
    public List<PermissionManifestPermission> Permissions { get; init; } = [];
}

internal sealed class PermissionManifestPermission
{
    public string Code { get; init; } = "";
    public string Name { get; init; } = "";
    public int Order { get; init; }
}

internal sealed class PermissionManifestMenuItem
{
    public string Title { get; init; } = "";
    public string? Path { get; init; }
    public string Icon { get; init; } = "";
    public string Active { get; init; } = "";
    public List<string>? PermissionCodes { get; init; }
    public List<PermissionManifestMenuItem>? Children { get; init; }
}

internal static class PermissionManifestProvider
{
    private static readonly Lazy<PermissionManifest> Manifest = new(LoadManifestInternal);

    public static PermissionManifest LoadManifest() => Manifest.Value;

    private static PermissionManifest LoadManifestInternal()
    {
        var manifestPath = Path.Combine(AppContext.BaseDirectory, "permission-manifest.json");
        if (!File.Exists(manifestPath))
            throw new FileNotFoundException("Permission manifest file not found", manifestPath);

        var json = File.ReadAllText(manifestPath);
        var manifest = JsonSerializer.Deserialize<PermissionManifest>(
            json,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
            });

        if (manifest == null)
            throw new InvalidOperationException("Permission manifest could not be deserialized");

        return manifest;
    }
}
