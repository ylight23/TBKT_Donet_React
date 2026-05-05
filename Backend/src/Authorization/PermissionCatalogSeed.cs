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
        BuildFromStaticMenus(PermissionManifestProvider.LoadManifest().StaticMenus);

    private static IReadOnlyList<PermissionCatalogSeedGroup> BuildFromStaticMenus(
        IReadOnlyList<PermissionManifestMenuItem> menus)
    {
        var permissions = new List<PermissionCatalogSeedItem>();
        var order = 10;

        foreach (var menu in menus)
            AddMenuPermission(menu, permissions, ref order);

        return
        [
            new PermissionCatalogSeedGroup(
                "Menu chức năng",
                "Menu",
                10,
                permissions)
        ];
    }

    private static void AddMenuPermission(
        PermissionManifestMenuItem menu,
        List<PermissionCatalogSeedItem> permissions,
        ref int order)
    {
        var codes = menu.PermissionCodes?
            .Where(code => !string.IsNullOrWhiteSpace(code))
            .Select(code => code.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList() ?? [];

        for (var index = 0; index < codes.Count; index++)
        {
            var code = codes[index];
            permissions.Add(new PermissionCatalogSeedItem(
                code,
                codes.Count == 1 ? menu.Title : $"{menu.Title} - {code}",
                order++));
        }

        if (menu.Children == null)
            return;

        foreach (var child in menu.Children)
            AddMenuPermission(child, permissions, ref order);
    }
}
