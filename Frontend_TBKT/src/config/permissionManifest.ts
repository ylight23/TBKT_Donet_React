import type { PermissionGroup } from '../types/permission';
import permissionManifestJson from './permission-manifest.json';

export interface PermissionManifestPermission {
    code: string;
    name: string;
    order: number;
}

export interface PermissionManifestGroup {
    group: string;
    icon: string;
    order: number;
    permissions: PermissionManifestPermission[];
}

export interface PermissionManifestMenuItem {
    title: string;
    path?: string;
    icon: string;
    active: string;
    permissionCodes?: string[];
    children?: PermissionManifestMenuItem[];
}

export interface PermissionManifest {
    permissionGroups: PermissionManifestGroup[];
    staticMenus: PermissionManifestMenuItem[];
}

export const permissionManifest = permissionManifestJson as PermissionManifest;

export const permissionManifestGroupsToUi = (): PermissionGroup[] =>
    permissionManifest.permissionGroups
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((group) => ({
            group: group.group,
            icon: group.icon,
            permissions: group.permissions
                .slice()
                .sort((a, b) => a.order - b.order)
                .map((permission) => ({
                    code: permission.code,
                    name: permission.name,
                })),
        }));
