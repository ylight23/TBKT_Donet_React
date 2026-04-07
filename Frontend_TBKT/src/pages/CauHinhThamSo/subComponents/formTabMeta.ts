import { LocalFormTabConfig as FormTabConfig } from '../../../types/thamSo';

export type TabType = 'normal' | 'sync-group';
export type SyncSourceType = 'category' | 'tree' | string;
export type DisplayMode = 'grid';

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

export const randomId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const isMetaToken = (_id: string) => false;

export const parseTabMeta = (_tab: FormTabConfig): TabMeta => ({
    tabType: 'normal',
    displayMode: 'grid',
    displayColumns: 2,
    showSetBadges: true,
    showFieldCount: true,
});

export const getRealSetIds = (tab: FormTabConfig): string[] =>
    tab.setIds
        .filter((id) => Boolean(id))
        .map((id) => String(id).trim())
        .filter((id) => id.length > 0)
        .filter((id, index, arr) => arr.indexOf(id) === index);

export const withTabMeta = (tab: FormTabConfig, _meta: TabMeta, realSetIds?: string[]): FormTabConfig => {
    const nextRealSetIds = realSetIds ?? getRealSetIds(tab);
    return {
        ...tab,
        setIds: [...nextRealSetIds],
    };
};

export const getTabDepth = (_tab: FormTabConfig): number => 0;
