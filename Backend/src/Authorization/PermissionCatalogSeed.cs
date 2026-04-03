namespace Backend.Authorization;

internal sealed record PermissionCatalogSeedGroup(
    string Group,
    string Icon,
    int Order,
    IReadOnlyList<PermissionCatalogSeedItem> Permissions);

internal sealed record PermissionCatalogSeedItem(
    string Code,
    string Name,
    int Order);

internal static class PermissionCatalogSeed
{
    public static IReadOnlyList<PermissionCatalogSeedGroup> Groups { get; } =
        PermissionManifestProvider.LoadManifest()
            .PermissionGroups
            .OrderBy(group => group.Order)
            .Select(group => new PermissionCatalogSeedGroup(
                group.Group,
                group.Icon,
                group.Order,
                group.Permissions
                    .OrderBy(permission => permission.Order)
                    .Select(permission => new PermissionCatalogSeedItem(
                        permission.Code,
                        permission.Name,
                        permission.Order))
                    .ToList()))
            .ToList();
}
