import { LocalFormTabConfig as FormTabConfig } from '../../../types/thamSo';

export type TabType = 'normal' | 'sync-group' | 'sync-leaf';
export type SyncSourceType = 'root_equipment';
export type DisplayMode = 'grid' | 'table';

export interface TabMeta {
    tabType: TabType;
    parentTabId?: string;
    syncSourceType?: SyncSourceType;
    syncCategory?: string;
    displayMode?: DisplayMode;
    displayColumns?: 1 | 2 | 3 | 4;
    showSetBadges?: boolean;
    showFieldCount?: boolean;
}

const META_PREFIX = '__meta:';
const META_TYPE_PREFIX = `${META_PREFIX}type:`;
const META_PARENT_PREFIX = `${META_PREFIX}parent:`;
const META_SOURCE_PREFIX = `${META_PREFIX}source:`;
const META_CATEGORY_PREFIX = `${META_PREFIX}category:`;
const META_DISPLAY_MODE_PREFIX = `${META_PREFIX}displayMode:`;
const META_DISPLAY_COLS_PREFIX = `${META_PREFIX}displayCols:`;
const META_SHOW_SET_BADGES_PREFIX = `${META_PREFIX}showSetBadges:`;
const META_SHOW_FIELD_COUNT_PREFIX = `${META_PREFIX}showFieldCount:`;

export const randomId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const isMetaToken = (id: string) => id.startsWith(META_PREFIX);

export const parseTabMeta = (tab: FormTabConfig): TabMeta => {
    const meta: TabMeta = {
        tabType: 'normal',
        displayMode: 'grid',
        displayColumns: 2,
        showSetBadges: true,
        showFieldCount: true,
    };

    tab.setIds.forEach((token) => {
        if (token.startsWith(META_TYPE_PREFIX)) {
            const value = token.slice(META_TYPE_PREFIX.length) as TabType;
            if (value === 'sync-group' || value === 'sync-leaf' || value === 'normal') {
                meta.tabType = value;
            }
            return;
        }

        if (token.startsWith(META_PARENT_PREFIX)) {
            meta.parentTabId = token.slice(META_PARENT_PREFIX.length);
            return;
        }

        if (token.startsWith(META_SOURCE_PREFIX)) {
            const value = token.slice(META_SOURCE_PREFIX.length);
            if (value === 'root_equipment') {
                meta.syncSourceType = value;
            }
            return;
        }

        if (token.startsWith(META_CATEGORY_PREFIX)) {
            meta.syncCategory = token.slice(META_CATEGORY_PREFIX.length);
            return;
        }

        if (token.startsWith(META_DISPLAY_MODE_PREFIX)) {
            const value = token.slice(META_DISPLAY_MODE_PREFIX.length) as DisplayMode;
            if (value === 'grid' || value === 'table') {
                meta.displayMode = value;
            }
            return;
        }

        if (token.startsWith(META_DISPLAY_COLS_PREFIX)) {
            const rawValue = Number(token.slice(META_DISPLAY_COLS_PREFIX.length));
            if ([1, 2, 3, 4].includes(rawValue)) {
                meta.displayColumns = rawValue as 1 | 2 | 3 | 4;
            }
            return;
        }

        if (token.startsWith(META_SHOW_SET_BADGES_PREFIX)) {
            meta.showSetBadges = token.slice(META_SHOW_SET_BADGES_PREFIX.length) !== '0';
            return;
        }

        if (token.startsWith(META_SHOW_FIELD_COUNT_PREFIX)) {
            meta.showFieldCount = token.slice(META_SHOW_FIELD_COUNT_PREFIX.length) !== '0';
        }
    });

    return meta;
};

export const getRealSetIds = (tab: FormTabConfig): string[] => tab.setIds.filter((id) => !isMetaToken(id));

export const withTabMeta = (tab: FormTabConfig, meta: TabMeta, realSetIds?: string[]): FormTabConfig => {
    const nextRealSetIds = realSetIds ?? getRealSetIds(tab);
    const metaTokens: string[] = [];

    if (meta.tabType && meta.tabType !== 'normal') {
        metaTokens.push(`${META_TYPE_PREFIX}${meta.tabType}`);
    }
    if (meta.parentTabId) {
        metaTokens.push(`${META_PARENT_PREFIX}${meta.parentTabId}`);
    }
    if (meta.syncSourceType) {
        metaTokens.push(`${META_SOURCE_PREFIX}${meta.syncSourceType}`);
    }
    if (meta.syncCategory) {
        metaTokens.push(`${META_CATEGORY_PREFIX}${meta.syncCategory}`);
    }
    if (meta.displayMode && meta.displayMode !== 'grid') {
        metaTokens.push(`${META_DISPLAY_MODE_PREFIX}${meta.displayMode}`);
    }
    if (meta.displayColumns && meta.displayColumns !== 2) {
        metaTokens.push(`${META_DISPLAY_COLS_PREFIX}${meta.displayColumns}`);
    }
    if (meta.showSetBadges === false) {
        metaTokens.push(`${META_SHOW_SET_BADGES_PREFIX}0`);
    }
    if (meta.showFieldCount === false) {
        metaTokens.push(`${META_SHOW_FIELD_COUNT_PREFIX}0`);
    }

    return {
        ...tab,
        setIds: [...nextRealSetIds, ...metaTokens],
    };
};

export const getTabDepth = (tab: FormTabConfig): number => (parseTabMeta(tab).parentTabId ? 1 : 0);
