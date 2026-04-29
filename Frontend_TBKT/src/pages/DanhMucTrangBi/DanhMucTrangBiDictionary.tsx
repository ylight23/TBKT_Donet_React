import React, { CSSProperties, MutableRefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Clear from '@mui/icons-material/Clear';
import ExpandMore from '@mui/icons-material/ExpandMore';
import Search from '@mui/icons-material/Search';
import { useTheme } from '@mui/material/styles';
import { useVirtualizer } from '@tanstack/react-virtual';
import danhMucTrangBiApi, { type DanhMucTrangBiTree } from '../../apis/danhMucTrangBiApi';
import { getStripedRowSx } from '../../utils/stripedSurface';
import { TreeSkeleton } from '../../components/Skeletons';

// ── Types ──────────────────────────────────────────────────────────────────────

type NodesByParent = Record<string, DanhMucTrangBiTree[]>;

interface TreeRow {
    node: DanhMucTrangBiTree;
    depth: number;
    isExpanded: boolean;
    canExpand: boolean;
    badgeCount?: number;
}

interface DanhMucTrangBiDictionaryProps {
    onSelect?: (node: DanhMucTrangBiTree) => void;
    selectedId?: string;
    badgeCounts?: Record<string, number>;
}

interface VirtualTreeRowProps {
    row: TreeRow;
    rowIndex: number;
    isSelected: boolean;
    onToggleExpand: (id: string) => void;
    onSelect?: (node: DanhMucTrangBiTree) => void;
    style: CSSProperties;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const ROOT_KEY = 'root';
const ROW_HEIGHT = 40;
const ROW_HEIGHT_WITH_BADGE = 48;
const TREE_GUIDE_STEP = 20;
const TREE_GUIDE_LEFT = 10;
const TREE_GUIDE_OVERLAP = 8;
const TREE_GUIDE_RADIUS = 12;
const TREE_GUIDE_WIDTH = '1px solid';

const TreeGuideLines: React.FC<{ depth: number; rowHeight: number; hasExpandedChildren?: boolean; active?: boolean }> = ({
    depth,
    rowHeight,
    hasExpandedChildren = false,
    active = false,
}) => {
    const theme = useTheme();
    if (depth <= 0 && !hasExpandedChildren) return null;

    const lineColor = active
        ? (theme.palette.mode === 'dark' ? '#7BC47F' : '#1B5E20')
        : (theme.palette.mode === 'dark' ? 'rgba(123,196,127,0.42)' : 'rgba(27, 94, 32, 0.42)');
    const elbowTop = Math.floor(rowHeight / 2);

    return (
        <Box aria-hidden sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {Array.from({ length: depth }).map((_, level) => {
                const left = level * TREE_GUIDE_STEP + TREE_GUIDE_LEFT;
                const isCurrent = level === depth - 1;
                return (
                    <React.Fragment key={level}>
                        {!isCurrent && (
                            <Box
                                data-tree-guide="true"
                                sx={{
                                    position: 'absolute',
                                    left,
                                    top: -TREE_GUIDE_OVERLAP,
                                    bottom: -TREE_GUIDE_OVERLAP,
                                    borderLeft: TREE_GUIDE_WIDTH,
                                    borderColor: lineColor,
                                    transition: 'border-color 120ms ease',
                                }}
                            />
                        )}
                        {isCurrent && (
                            <Box
                                data-tree-guide="true"
                                sx={{
                                    position: 'absolute',
                                    left,
                                    top: -TREE_GUIDE_OVERLAP,
                                    width: 18,
                                    height: elbowTop + TREE_GUIDE_OVERLAP + 1,
                                    borderLeft: TREE_GUIDE_WIDTH,
                                    borderBottom: TREE_GUIDE_WIDTH,
                                    borderBottomLeftRadius: TREE_GUIDE_RADIUS,
                                    borderColor: lineColor,
                                    transition: 'border-color 120ms ease',
                                }}
                            />
                        )}
                    </React.Fragment>
                );
            })}
            {hasExpandedChildren && (
                <Box
                    data-tree-guide="true"
                    sx={{
                        position: 'absolute',
                        left: depth * TREE_GUIDE_STEP + TREE_GUIDE_LEFT,
                        top: elbowTop - 1,
                        bottom: -TREE_GUIDE_OVERLAP,
                        borderLeft: TREE_GUIDE_WIDTH,
                        borderColor: lineColor,
                        transition: 'border-color 120ms ease',
                    }}
                />
            )}
        </Box>
    );
};

// ── Module-level cache ─────────────────────────────────────────────────────────

let cachedDanhMucTrangBiTree: DanhMucTrangBiTree[] | null = null;
let cachedDanhMucTrangBiTreePromise: Promise<DanhMucTrangBiTree[]> | null = null;
// All items ref — accessible by search without needing items in state
const allItemsRef: { current: DanhMucTrangBiTree[] } = { current: [] };

// ── useSyncedStateRef ──────────────────────────────────────────────────────────
// Returns [state, mutableRef, setter].
// The setter updates both the ref (synchronously, before re-render) and the state.
// This allows other callbacks to read the current value via ref without stale closures.

type SyncedSetter<T> = (updater: T | ((prev: T) => T)) => T;

function useSyncedStateRef<T>(initial: T): [T, MutableRefObject<T>, SyncedSetter<T>] {
    const [state, setState] = useState<T>(initial);
    const ref = useRef<T>(initial);

    const setSynced = useCallback<SyncedSetter<T>>((updater) => {
        const next = typeof updater === 'function'
            ? (updater as (prev: T) => T)(ref.current)
            : updater;
        ref.current = next;
        setState(next);
        return next;
    }, []);

    return [state, ref, setSynced];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const normalizeText = (value: unknown): string => String(value ?? '').trim();
const getNodeId = (node: DanhMucTrangBiTree): string => normalizeText(node.id);
const getParentNodeId = (node: DanhMucTrangBiTree): string | null => {
    const parentId = normalizeText(node.idCapTren);
    return parentId || null;
};
const getNodeLabel = (node: DanhMucTrangBiTree): string =>
    normalizeText(node.ten) || normalizeText(node.tenDayDu) || getNodeId(node);
const hasChildren = (node: DanhMucTrangBiTree, nodesByParent: NodesByParent): boolean => {
    const id = getNodeId(node);
    return Boolean(node.coCapDuoi) || Boolean(nodesByParent[id]?.length);
};

// ── buildNodesByParent ─────────────────────────────────────────────────────────

const buildNodesByParent = (items: DanhMucTrangBiTree[]): {
    nodesByParent: NodesByParent;
    parentByNodeId: Record<string, string>;
} => {
    const nodesByParent: NodesByParent = { [ROOT_KEY]: [] };
    const idSet = new Set<string>();
    const parentByNodeId: Record<string, string> = {};

    items.forEach((item) => {
        const id = getNodeId(item);
        if (id) idSet.add(id);
    });

    items.forEach((item) => {
        const id = getNodeId(item);
        if (!id) return;

        const parentId = getParentNodeId(item);
        const parentKey = parentId && idSet.has(parentId) ? parentId : ROOT_KEY;
        if (!nodesByParent[parentKey]) nodesByParent[parentKey] = [];
        nodesByParent[parentKey].push(item);
        parentByNodeId[id] = parentKey;
    });

    for (const key of Object.keys(nodesByParent)) {
        nodesByParent[key].sort((a, b) => getNodeId(a).localeCompare(getNodeId(b), 'vi'));
    }

    return { nodesByParent, parentByNodeId };
};

// ── preloadDanhMucTrangBiTree ──────────────────────────────────────────────────

export async function preloadDanhMucTrangBiTree(): Promise<DanhMucTrangBiTree[]> {
    if (cachedDanhMucTrangBiTree) return cachedDanhMucTrangBiTree;
    cachedDanhMucTrangBiTreePromise ??= danhMucTrangBiApi.getTreeChildren({ loadAll: true });
    const result = await cachedDanhMucTrangBiTreePromise;
    cachedDanhMucTrangBiTree = result;
    return result;
}

// ── VirtualTreeRow ─────────────────────────────────────────────────────────────

const VirtualTreeRow = React.memo(function VirtualTreeRow({
    row,
    rowIndex,
    isSelected,
    onToggleExpand,
    onSelect,
    style,
}: VirtualTreeRowProps) {
    const theme = useTheme();
    const id = getNodeId(row.node);
    const label = getNodeLabel(row.node);
    const subtitle = normalizeText(row.node.tenDayDu);
    const badgeCount = row.badgeCount ?? 0;
    const rowHeight = badgeCount > 0 ? ROW_HEIGHT_WITH_BADGE : ROW_HEIGHT;

    return (
        <Box
            sx={{
                ...style,
                position: 'absolute',
                height: rowHeight,
                display: 'flex',
                alignItems: 'center',
                pl: `${row.depth * TREE_GUIDE_STEP}px`,
                pr: 1,
                cursor: 'pointer',
                borderRadius: 2.5,
                ...getStripedRowSx(theme, rowIndex, isSelected),
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                userSelect: 'none',
                mb: 0.25,
                '&:hover [data-tree-guide="true"]': {
                    borderColor: theme.palette.mode === 'dark' ? '#7BC47F' : '#1B5E20',
                },
            }}
            onClick={() => onSelect?.(row.node)}
        >
            <TreeGuideLines depth={row.depth} rowHeight={rowHeight} hasExpandedChildren={row.canExpand && row.isExpanded} active={isSelected} />
            <Box
                sx={{ width: 28, height: rowHeight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onClick={row.canExpand ? (event: React.MouseEvent) => {
                    event.stopPropagation();
                    onToggleExpand(id);
                } : undefined}
            >
                {row.canExpand && (
                    row.isExpanded
                        ? <ExpandMore sx={{ fontSize: 18, color: '#555' }} />
                        : <ChevronRight sx={{ fontSize: 18, color: '#555' }} />
                )}
            </Box>

            <Tooltip title={subtitle ? `${id} - ${subtitle}` : `${id} - ${label}`} placement="right" enterDelay={500}>
                <Box sx={{ minWidth: 0, flex: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                            noWrap
                            variant="body1"
                            sx={{
                                fontSize: '0.925rem',
                                fontWeight: isSelected ? 700 : 400,
                                color: isSelected ? theme.palette.primary.main : 'text.primary',
                            }}
                        >
                            {label}
                        </Typography>
                        <Typography variant="caption" noWrap color="text.secondary">
                            {id}
                        </Typography>
                    </Box>
                    {badgeCount > 0 && (
                        <Chip
                            size="small"
                            label={badgeCount}
                            color="primary"
                            sx={{
                                height: 18,
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                flexShrink: 0,
                                '& .MuiChip-label': { px: 0.75 },
                            }}
                        />
                    )}
                </Box>
            </Tooltip>
        </Box>
    );
});

// ── DanhMucTrangBiDictionary ───────────────────────────────────────────────────

const DanhMucTrangBiDictionary: React.FC<DanhMucTrangBiDictionaryProps> = ({ onSelect, selectedId = '', badgeCounts = {} }) => {
    const theme = useTheme();
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchRequestIdRef = useRef(0);
    const badgeCountsRef = useRef<Record<string, number>>(badgeCounts);

    // Keep ref in sync with prop
    React.useEffect(() => { badgeCountsRef.current = badgeCounts; }, [badgeCounts]);

    // Pure refs — lookup indexes, never need to trigger re-renders
    const nodesByParentRef = useRef<NodesByParent>({ [ROOT_KEY]: [] });
    const parentByNodeIdRef = useRef<Record<string, string>>({});

    // Synced state+ref — needed for rendering AND for reading without stale closures
    const [expandedSet, expandedSetRef, setExpandedSetSynced] = useSyncedStateRef<Set<string>>(new Set());
    const [visibleTreeRows, , setVisibleTreeRowsSynced] = useSyncedStateRef<TreeRow[]>([]);

    // Simple state for UI control
    const [isLoaded, setIsLoaded] = useState(false);
    const [rootNodeCount, setRootNodeCount] = useState(0);
    const [searchText, setSearchText] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState<DanhMucTrangBiTree[] | null>(null);
    const [loadingRoot, setLoadingRoot] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ── Tree computation ─────────────────────────────────────────────────────

    // appendRows: shared-accumulator tree flatten — no intermediate array allocations
    const appendRows = useCallback((
        acc: TreeRow[],
        parentKey: string,
        depth: number,
        nodesByParent: NodesByParent,
        expandedSet: Set<string>,
        badgeCounts: Record<string, number>,
    ): void => {
        const nodes = nodesByParent[parentKey];
        if (!nodes) return;
        for (const node of nodes) {
            const id = getNodeId(node);
            const isExpanded = expandedSet.has(id);
            const canExpand = hasChildren(node, nodesByParent);
            acc.push({ node, depth, isExpanded, canExpand, badgeCount: badgeCounts[id] ?? 0 });
            if (isExpanded) {
                appendRows(acc, id, depth + 1, nodesByParent, expandedSet, badgeCounts);
            }
        }
    }, []);

    const rebuildVisibleTree = useCallback(() => {
        const rows: TreeRow[] = [];
        appendRows(rows, ROOT_KEY, 0, nodesByParentRef.current, expandedSetRef.current, badgeCountsRef.current);
        setVisibleTreeRowsSynced(rows);
    }, [appendRows, expandedSetRef, setVisibleTreeRowsSynced]);

    // syncVisibleBranch: surgical O(k) patch — only splice descendants of changedKey
    const syncVisibleBranch = useCallback((changedKey: string) => {
        if (changedKey === ROOT_KEY) {
            rebuildVisibleTree();
            return;
        }

        setVisibleTreeRowsSynced((prev) => {
            const rows = [...prev];

            // Find the row for changedKey
            const parentIdx = rows.findIndex(r => getNodeId(r.node) === changedKey);
            if (parentIdx === -1) {
                // Parent not visible — rebuild from scratch
                const acc: TreeRow[] = [];
                appendRows(acc, ROOT_KEY, 0, nodesByParentRef.current, expandedSetRef.current, badgeCountsRef.current);
                return acc;
            }

            const parentDepth = rows[parentIdx].depth;
            const isNowExpanded = expandedSetRef.current.has(changedKey);

            // Update the expand icon on the parent row
            rows[parentIdx] = { ...rows[parentIdx], isExpanded: isNowExpanded };

            // Find the range of existing children for changedKey (depth > parentDepth, contiguous)
            let spliceEnd = parentIdx + 1;
            while (spliceEnd < rows.length && rows[spliceEnd].depth > parentDepth) {
                spliceEnd++;
            }
            const existingChildCount = spliceEnd - (parentIdx + 1);

            // Build new children if expanded
            const newChildren: TreeRow[] = [];
            if (isNowExpanded) {
                appendRows(newChildren, changedKey, parentDepth + 1, nodesByParentRef.current, expandedSetRef.current, badgeCountsRef.current);
            }

            // Splice: replace existing children with new
            rows.splice(parentIdx + 1, existingChildCount, ...newChildren);
            return rows;
        });
    }, [appendRows, expandedSetRef, rebuildVisibleTree, setVisibleTreeRowsSynced]);

    // ── Initial load ─────────────────────────────────────────────────────────

    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            setLoadingRoot(true);
            setError(null);
            try {
                const result = await preloadDanhMucTrangBiTree();
                if (cancelled) return;

                const items = result ?? [];
                const { nodesByParent, parentByNodeId } = buildNodesByParent(items);

                // Write directly to refs — no re-renders for index lookups
                allItemsRef.current = items;
                nodesByParentRef.current = nodesByParent;
                parentByNodeIdRef.current = parentByNodeId;

                // Reset expanded state and rebuild full visible list
                setExpandedSetSynced(new Set());
                setRootNodeCount(nodesByParent[ROOT_KEY]?.length ?? 0);
                setIsLoaded(true);

                const rows: TreeRow[] = [];
                appendRows(rows, ROOT_KEY, 0, nodesByParent, new Set(), badgeCountsRef.current);
                setVisibleTreeRowsSynced(rows);

            } catch (fetchError) {
                cachedDanhMucTrangBiTreePromise = null;
                if (!cancelled) {
                    console.error('[DanhMucTrangBiDictionary] getTreeChildren error:', fetchError);
                    setError('Không tải được danh mục trang bị.');
                }
            } finally {
                if (!cancelled) setLoadingRoot(false);
            }
        };

        void load();
        return () => { cancelled = true; };
    // appendRows and setters are stable (useCallback / useSyncedStateRef)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Auto-expand ancestors when selectedId changes ────────────────────────

    useEffect(() => {
        if (!selectedId || !isLoaded) return;

        const pbni = parentByNodeIdRef.current;
        if (!pbni[selectedId]) return;

        const toExpand = new Set<string>();
        let currentId = selectedId;
        while (pbni[currentId] && pbni[currentId] !== ROOT_KEY) {
            const parentId = pbni[currentId];
            toExpand.add(parentId);
            currentId = parentId;
        }
        if (toExpand.size === 0) return;

        const next = new Set([...expandedSetRef.current, ...toExpand]);
        setExpandedSetSynced(next);
        rebuildVisibleTree();
    // expandedSetRef is a ref — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId, isLoaded, rebuildVisibleTree, setExpandedSetSynced]);

    // ── Expand / Collapse ────────────────────────────────────────────────────

    const handleToggleExpand = useCallback((itemId: string) => {
        // Read current expanded set from ref (never stale)
        const next = new Set(expandedSetRef.current);
        if (next.has(itemId)) {
            next.delete(itemId);
        } else {
            next.add(itemId);
        }
        // Update ref synchronously so syncVisibleBranch reads the correct new value
        setExpandedSetSynced(next);
        syncVisibleBranch(itemId);
    }, [expandedSetRef, setExpandedSetSynced, syncVisibleBranch]);

    // ── Search ───────────────────────────────────────────────────────────────

    const performSearch = useCallback((query: string) => {
        const trimmedQuery = query.trim().toLowerCase();
        const requestId = ++searchRequestIdRef.current;

        if (!trimmedQuery) {
            setSearchLoading(false);
            setSearchResults(null);
            return;
        }

        setSearchLoading(true);
        // Defer to next tick so spinner renders before CPU-bound filter
        window.setTimeout(() => {
            if (requestId !== searchRequestIdRef.current) return;

            const result = allItemsRef.current.filter((item) => {
                const id = getNodeId(item).toLowerCase();
                const label = getNodeLabel(item).toLowerCase();
                const subtitle = normalizeText(item.tenDayDu).toLowerCase();
                return id.includes(trimmedQuery) || label.includes(trimmedQuery) || subtitle.includes(trimmedQuery);
            });

            setSearchResults(result);
            setSearchLoading(false);
        }, 0);
    }, []);

    useEffect(() => {
        if (!searchText.trim()) {
            searchRequestIdRef.current += 1;
            setSearchLoading(false);
            setSearchResults(null);
            return;
        }
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => performSearch(searchText), 300);
        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [performSearch, searchText]);

    const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            performSearch(searchText);
        }
    }, [performSearch, searchText]);

    const handleSearchClick = useCallback(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        performSearch(searchText);
    }, [performSearch, searchText]);

    const handleClearSearch = useCallback(() => {
        searchRequestIdRef.current += 1;
        setSearchText('');
        setSearchLoading(false);
        setSearchResults(null);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    }, []);

    // ── Derived display values ───────────────────────────────────────────────

    const isSearchMode = Boolean(searchText.trim());
    const displayCount = isSearchMode ? (searchResults?.length ?? 0) : rootNodeCount;

    const visibleList = useMemo<TreeRow[]>(() => {
        if (isSearchMode) {
            return (searchResults ?? []).map((node) => ({
                node,
                depth: 0,
                isExpanded: false,
                canExpand: false,
                badgeCount: badgeCountsRef.current[node.id ?? ''] ?? 0,
            }));
        }
        return visibleTreeRows;
    }, [isSearchMode, searchResults, visibleTreeRows]);

    // ── Virtualizer ──────────────────────────────────────────────────────────

    const virtualizer = useVirtualizer({
        count: visibleList.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: () => ROW_HEIGHT,
        getItemKey: (index) => getNodeId(visibleList[index]?.node) || `node-${index}`,
        measureElement: (el) => el.getBoundingClientRect().height,
        overscan: 10,
    });

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <Box sx={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', backgroundColor: 'background.paper', height: '100%', overflow: 'hidden' }}>
            <Box sx={{ p: 2, pb: 1, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
                <TextField
                    size="small"
                    fullWidth
                    placeholder="Tìm kiếm danh mục trang bị (nhấn Enter)…"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={searchLoading}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                {searchLoading ? (
                                    <CircularProgress size={18} />
                                ) : (
                                    <IconButton
                                        size="small"
                                        edge="start"
                                        onClick={handleSearchClick}
                                        disabled={!searchText.trim()}
                                        sx={{ '&:hover': { backgroundColor: 'rgba(25,118,210,0.08)' } }}
                                    >
                                        <Search fontSize="small" />
                                    </IconButton>
                                )}
                            </InputAdornment>
                        ),
                        endAdornment: searchText ? (
                            <InputAdornment position="end">
                                <IconButton size="small" edge="end" onClick={handleClearSearch} disabled={searchLoading}>
                                    <Clear fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ) : null,
                    }}
                    sx={{
                        mb: 1,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2.5,
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.01)',
                            '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.03)' },
                        },
                    }}
                />
                {(isLoaded || searchResults) && (
                    <Typography variant="caption" sx={{ color: '#757575', fontSize: '0.875rem' }}>
                        {isSearchMode
                            ? (searchLoading ? 'Đang tìm kiếm…' : `Tìm thấy ${displayCount} danh mục`)
                            : `${displayCount} danh mục`}
                    </Typography>
                )}
            </Box>

            <Box sx={{ flex: 1, overflow: 'hidden', px: 1, py: 1 }}>
                {loadingRoot || searchLoading ? (
                    <TreeSkeleton rows={8} />
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : visibleList.length === 0 ? (
                    <Alert severity="info">
                        {isSearchMode ? 'Không tìm thấy danh mục phù hợp' : 'Không có dữ liệu danh mục trang bị'}
                    </Alert>
                ) : (
                    <div ref={scrollContainerRef} style={{ height: '100%', overflow: 'auto' }}>
                        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
                            {virtualizer.getVirtualItems().map((virtualRow) => {
                                const row = visibleList[virtualRow.index];
                                return (
                                    <VirtualTreeRow
                                        key={virtualRow.key}
                                        row={row}
                                        rowIndex={virtualRow.index}
                                        isSelected={getNodeId(row.node) === selectedId}
                                        onToggleExpand={handleToggleExpand}
                                        onSelect={onSelect}
                                        style={{
                                            position: 'absolute',
                                            top: `${virtualRow.start}px`,
                                            width: '100%',
                                            height: `${ROW_HEIGHT}px`,
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </Box>
        </Box>
    );
};

export default DanhMucTrangBiDictionary;
