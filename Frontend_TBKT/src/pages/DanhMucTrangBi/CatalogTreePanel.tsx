import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderIcon from '@mui/icons-material/Folder';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import DescriptionIcon from '@mui/icons-material/Description';
import catalogApi, { type CatalogTree } from '../../apis/catalogApi';

interface FlatTreeItem {
    id: string;
    ten: string;
    tenDayDu: string | undefined;
    depth: number;
    coCapDuoi: boolean;
    isExpanded: boolean;
    isLoading: boolean;
    rawNode: CatalogTree;
}

function buildFlatList(
    parentId: string,
    depth: number,
    cache: Map<string, CatalogTree[]>,
    expandedIds: Set<string>,
    loadingIds: Set<string>,
): FlatTreeItem[] {
    const items = cache.get(parentId) ?? [];
    return items.flatMap((node) => {
        const id = node.id ?? '';
        const isExpanded = expandedIds.has(id);
        const isLoading = loadingIds.has(id);
        const item: FlatTreeItem = {
            id,
            ten: node.ten ?? id,
            tenDayDu: node.tenDayDu,
            depth,
            coCapDuoi: node.coCapDuoi,
            isExpanded,
            isLoading,
            rawNode: node,
        };
        if (isExpanded && cache.has(id)) {
            return [item, ...buildFlatList(id, depth + 1, cache, expandedIds, loadingIds)];
        }
        return [item];
    });
}

interface CatalogTreePanelProps {
    cn: string;
    selectedId: string;
    onSelect: (node: CatalogTree) => void;
}

const CATALOG_NAME = 'DanhMucTrangBi';
const ITEM_HEIGHT = 36;

const CatalogTreePanel: React.FC<CatalogTreePanelProps> = ({ cn, selectedId, onSelect }) => {
    const [cache, setCache] = useState<Map<string, CatalogTree[]>>(new Map());
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [loadingRoot, setLoadingRoot] = useState(false);
    const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
    const [searchText, setSearchText] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [searchResults, setSearchResults] = useState<CatalogTree[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    const scrollRef = useRef<HTMLDivElement>(null);

    // Debounce search
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchText.trim()), 300);
        return () => clearTimeout(t);
    }, [searchText]);

    // Load root nodes when cn changes
    useEffect(() => {
        if (!cn) return;
        let cancelled = false;
        // Root nodes are children of the virtual root "{cn}.0.00.00.00.00.000"
        const rootParentId = `${cn}.0.00.00.00.00.000`;
        const load = async () => {
            setLoadingRoot(true);
            setCache(new Map());
            setExpandedIds(new Set());
            setSearchText('');
            setDebouncedSearch('');
            setSearchResults([]);
            try {
                const items = await catalogApi.getCatalogTreeChildren(CATALOG_NAME, { parentId: rootParentId });
                if (!cancelled) {
                    setCache(new Map([[rootParentId, items]]));
                    setTotalCount(items.length);
                }
            } catch {
                // silent – tree will show empty
            } finally {
                if (!cancelled) setLoadingRoot(false);
            }
        };
        void load();
        return () => { cancelled = true; };
    }, [cn]);

    // Search mode — use the root virtual parent so backend scopes within this CN
    useEffect(() => {
        if (!debouncedSearch || !cn) {
            setSearchResults([]);
            return;
        }
        let cancelled = false;
        const rootParentId = `${cn}.0.00.00.00.00.000`;
        const search = async () => {
            setSearchLoading(true);
            try {
                const items = await catalogApi.getCatalogTreeChildren(CATALOG_NAME, {
                    parentId: rootParentId,
                    searchText: debouncedSearch,
                    loadAll: true,
                });
                if (!cancelled) setSearchResults(items);
            } catch {
                if (!cancelled) setSearchResults([]);
            } finally {
                if (!cancelled) setSearchLoading(false);
            }
        };
        void search();
        return () => { cancelled = true; };
    }, [debouncedSearch, cn]);

    const loadChildren = useCallback(
        async (nodeId: string) => {
            if (cache.has(nodeId)) return; // already cached
            setLoadingIds((prev) => new Set([...prev, nodeId]));
            try {
                const items = await catalogApi.getCatalogTreeChildren(CATALOG_NAME, { parentId: nodeId });
                setCache((prev) => new Map([...prev, [nodeId, items]]));
            } finally {
                setLoadingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(nodeId);
                    return next;
                });
            }
        },
        [cache],
    );

    const toggleExpand = useCallback(
        (item: FlatTreeItem) => {
            if (!item.coCapDuoi) return;
            if (expandedIds.has(item.id)) {
                setExpandedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(item.id);
                    return next;
                });
            } else {
                setExpandedIds((prev) => new Set([...prev, item.id]));
                void loadChildren(item.id);
            }
        },
        [expandedIds, loadChildren],
    );

    const flatNodes = useMemo(() => {
        if (debouncedSearch) return [];
        const rootParentId = `${cn}.0.00.00.00.00.000`;
        return buildFlatList(rootParentId, 0, cache, expandedIds, loadingIds);
    }, [cn, cache, expandedIds, loadingIds, debouncedSearch]);

    const displayItems: FlatTreeItem[] = debouncedSearch
        ? searchResults.map((n) => ({
              id: n.id ?? '',
              ten: n.ten ?? n.id ?? '',
              tenDayDu: n.tenDayDu,
              depth: 0,
              coCapDuoi: n.coCapDuoi,
              isExpanded: false,
              isLoading: false,
              rawNode: n,
          }))
        : flatNodes;

    const virtualizer = useVirtualizer({
        count: displayItems.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ITEM_HEIGHT,
        overscan: 12,
    });

    const isSearchMode = debouncedSearch.length > 0;

    return (
        <Stack sx={{ height: '100%', overflow: 'hidden' }}>
            {/* Search bar */}
            <Box sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Tim kiem trang bi..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                {searchLoading ? (
                                    <CircularProgress size={16} />
                                ) : (
                                    <SearchIcon fontSize="small" />
                                )}
                            </InputAdornment>
                        ),
                        endAdornment: searchText ? (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setSearchText('')}>
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : null,
                    }}
                />
            </Box>

            {/* Count */}
            <Box sx={{ px: 2, pb: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                    {isSearchMode
                        ? `${searchResults.length} ket qua`
                        : `Tong: ${totalCount > 0 ? totalCount : cache.get(cn)?.length ?? 0}`}
                </Typography>
            </Box>

            {/* Tree / results */}
            {loadingRoot ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', pt: 4 }}>
                    <CircularProgress size={28} />
                </Box>
            ) : displayItems.length === 0 ? (
                <Box sx={{ px: 2, pt: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                        {isSearchMode ? 'Khong co ket qua.' : 'Khong co du lieu.'}
                    </Typography>
                </Box>
            ) : (
                <Box
                    ref={scrollRef}
                    sx={{ flex: 1, overflow: 'hidden auto', position: 'relative' }}
                >
                    <Box sx={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
                        {virtualizer.getVirtualItems().map((vItem) => {
                            const item = displayItems[vItem.index];
                            const isSelected = item.id === selectedId;
                            return (
                                <Box
                                    key={item.id}
                                    data-index={vItem.index}
                                    ref={virtualizer.measureElement}
                                    sx={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        transform: `translateY(${vItem.start}px)`,
                                        height: ITEM_HEIGHT,
                                        display: 'flex',
                                        alignItems: 'center',
                                        pl: 1 + item.depth * 2,
                                        pr: 0.5,
                                        cursor: 'pointer',
                                        bgcolor: isSelected ? 'primary.50' : 'transparent',
                                        borderLeft: isSelected ? '3px solid' : '3px solid transparent',
                                        borderColor: isSelected ? 'primary.main' : 'transparent',
                                        '&:hover': { bgcolor: isSelected ? 'primary.50' : 'action.hover' },
                                        transition: 'background-color 0.1s',
                                        userSelect: 'none',
                                    }}
                                    onClick={() => onSelect(item.rawNode)}
                                >
                                    {/* Expand toggle */}
                                    {item.coCapDuoi ? (
                                        <IconButton
                                            size="small"
                                            sx={{ p: 0.25, mr: 0.25 }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (!isSearchMode) toggleExpand(item);
                                            }}
                                        >
                                            {item.isLoading ? (
                                                <CircularProgress size={14} />
                                            ) : item.isExpanded ? (
                                                <ExpandMoreIcon sx={{ fontSize: 16 }} />
                                            ) : (
                                                <ChevronRightIcon sx={{ fontSize: 16 }} />
                                            )}
                                        </IconButton>
                                    ) : (
                                        <Box sx={{ width: 26 }} />
                                    )}

                                    {/* Icon */}
                                    {item.coCapDuoi ? (
                                        <FolderIcon
                                            sx={{ fontSize: 16, mr: 0.75, color: 'warning.main', flexShrink: 0 }}
                                        />
                                    ) : (
                                        <DescriptionIcon
                                            sx={{ fontSize: 14, mr: 0.75, color: 'text.disabled', flexShrink: 0 }}
                                        />
                                    )}

                                    {/* Label */}
                                    <Tooltip title={item.tenDayDu ?? item.ten} placement="right" enterDelay={600}>
                                        <Typography
                                            variant="body2"
                                            noWrap
                                            sx={{
                                                flex: 1,
                                                fontSize: '0.8rem',
                                                fontWeight: isSelected ? 600 : 400,
                                                color: isSelected ? 'primary.dark' : 'text.primary',
                                            }}
                                        >
                                            {item.id && item.ten ? `${item.id} – ${item.ten}` : item.ten || item.id}
                                        </Typography>
                                    </Tooltip>
                                </Box>
                            );
                        })}
                    </Box>
                </Box>
            )}
        </Stack>
    );
};

export default CatalogTreePanel;
