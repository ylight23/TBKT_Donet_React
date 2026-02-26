import React, {
    useEffect, useMemo, useState, useCallback, useRef,
    useTransition, startTransition, CSSProperties, useContext,
} from 'react';


import Box            from '@mui/material/Box';
import Typography     from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert          from '@mui/material/Alert';
import TextField      from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton     from '@mui/material/IconButton';
import ExpandMore     from '@mui/icons-material/ExpandMore';
import ChevronRight   from '@mui/icons-material/ChevronRight';
import Search         from '@mui/icons-material/Search';
import Clear          from '@mui/icons-material/Clear';

import { useVirtualizer }        from '@tanstack/react-virtual';
import officeApi                 from '../../../apis/officeApi';
import { serializeProtoObject }  from '../../../utils/serializeProto';
import OfficeContext             from '../../../context/OfficeContext';



// ── Types ──────────────────────────────────────────────────────────────────────

export interface OfficeNode {
    id?: string | number;
    ten?: string;
    tenDayDu?: string;
    vietTat?: string;        
    idCapTren?: string;
    coCapDuoi?: boolean;
    thuTu?: number;
    ngayTao?: unknown;
    ngaySua?: unknown;
    nguoiTao?: unknown;
    [key: string]: unknown;
}

interface LoadingRow {
    loading: true;
    depth: number;
}

interface TreeRow {
    node: OfficeNode;
    depth: number;
    isExpanded: boolean;
    isLoading: boolean;
    canExpand: boolean;
}

type VisibleRow = LoadingRow | TreeRow;

type NodesByParent = Record<string, OfficeNode[]>;
type LoadingByParent = Record<string, boolean>;

export interface OfficeDictionaryRef {
    refreshChildrenForParent: (parentId?: string | number | null) => Promise<void>;
    refreshNode: (nodeId: string | number) => Promise<void>;
    refreshTree: () => void;
    refreshNodeAndChildren: (nodeId: string | number) => Promise<void>;
    removeNode: (nodeId: string | number) => void; // thêm mới
    selectNode?: (nodeId: string) => void;   // ← thêm
}

export interface OfficeDictionaryProps {
    onSelect?: (node: OfficeNode) => void;
    onSelectOffice?: (node: OfficeNode) => void;
    selectedOffice?: OfficeNode | null;
    offices?: OfficeNode[];
}

// ── Module-level cache ─────────────────────────────────────────────────────────

const officeNodeCache = new Map<string, OfficeNode[]>();
const ROOT_KEY = 'root';
const ROW_HEIGHT = 40;

// ── computeVisibleList ─────────────────────────────────────────────────────────

function computeVisibleList(
    nodesByParent: NodesByParent,
    expandedSet: Set<string>,
    loadingByParent: LoadingByParent,
    parentKey: string = ROOT_KEY,
    depth: number = 0,
): VisibleRow[] {
    const nodes = nodesByParent[parentKey] || [];
    const rows: VisibleRow[] = [];

    for (const node of nodes) {
        const id = node.id?.toString() ?? '';
        const isExpanded = expandedSet.has(id);
        const isLoading = !!loadingByParent[id];
        const childNodes = nodesByParent[id];
        const coCapDuoi = Boolean(node.cocapduoi ?? node.coCapDuoi ?? node.CoCapDuoi ?? false);
        const canExpand = coCapDuoi || !!(childNodes && childNodes.length > 0);

        rows.push({ node, depth, isExpanded, isLoading, canExpand });

        if (isExpanded) {
            if (isLoading) {
                rows.push({ loading: true, depth: depth + 1 });
            } else {
                rows.push(...computeVisibleList(nodesByParent, expandedSet, loadingByParent, id, depth + 1));
            }
        }
    }
    return rows;
}

// ── VirtualTreeRow ─────────────────────────────────────────────────────────────

interface VirtualTreeRowProps {
    row: VisibleRow;
    isSelected: boolean;
    onToggleExpand: (id: string) => void;
    onSelect: (node: OfficeNode) => void;
    style: CSSProperties;
}

const VirtualTreeRow = React.memo(function VirtualTreeRow({
    row,
    isSelected,
    onToggleExpand,
    onSelect,
    style,
}: VirtualTreeRowProps) {
    if ((row as LoadingRow).loading) {
        const loadingRow = row as LoadingRow;
        return (
            <Box sx={{ ...style, display: 'flex', alignItems: 'center', pl: `${loadingRow.depth * 20 + 28}px`, gap: 1 }}>
                <CircularProgress size={14} />
                <Typography variant="body2" sx={{ color: '#757575', fontSize: '0.875rem' }}>Đang tải...</Typography>
            </Box>
        );
    }

    const { node, depth, isExpanded, canExpand } = row as TreeRow;
    const id = node.id?.toString() ?? '';
    const ten = node.ten || node.Ten || node.tenDayDu || node.TenDayDu || id;

    return (
        <Box
            sx={{
                ...style,
                display: 'flex',
                alignItems: 'center',
                pl: `${depth * 20}px`,
                pr: 1,
                cursor: 'pointer',
                borderRadius: 1,
                backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                '&:hover': { backgroundColor: isSelected ? '#bbdefb' : '#f5f5f5' },
                transition: 'background-color 0.1s',
                userSelect: 'none',
            }}
            onClick={() => onSelect(node)}
        >
            <Box
                sx={{ width: 28, height: ROW_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onClick={canExpand ? (e: React.MouseEvent) => { e.stopPropagation(); onToggleExpand(id); } : undefined}
            >
                {canExpand && (
                    isExpanded
                        ? <ExpandMore sx={{ fontSize: 18, color: '#555' }} />
                        : <ChevronRight sx={{ fontSize: 18, color: '#555' }} />
                )}
            </Box>
            <Typography noWrap variant="body1"
                sx={{ fontSize: '0.95rem', fontWeight: isSelected ? 600 : 400, flex: 1, minWidth: 0 }}
            >
                {ten as string}
            </Typography>
        </Box>
    );
});

// ── OfficeDictionary ───────────────────────────────────────────────────────────

const OfficeDictionary = React.forwardRef<OfficeDictionaryRef, OfficeDictionaryProps>((props, ref) => {
    const { onSelect, onSelectOffice } = props;

    // ── Đọc OfficeContext optional (không throw khi dùng từ Employee page) ────
    const officeCtx = useContext(OfficeContext);

    // ── Ưu tiên: props → context.state → fallback ─────────────────────────────
    const initialOffices: OfficeNode[] =
        props.offices ??
        officeCtx?.state.allOffices ??       // ← state.allOffices
        [];

    const selectedOffice: OfficeNode | null =
        props.selectedOffice !== undefined
            ? props.selectedOffice
            : officeCtx?.state.selectedOffice ?? null;  // ← state.selectedOffice

    const [nodesByParent, setNodesByParent] = useState<NodesByParent>({ [ROOT_KEY]: [] });
    const [nodeMap, setNodeMap] = useState<Record<string, OfficeNode>>({});
    const [expandedSet, setExpandedSet] = useState<Set<string>>(() => new Set());
    const [loadingByParent, setLoadingByParent] = useState<LoadingByParent>({});
    const [internalSelected, setInternalSelected] = useState<OfficeNode | null>(selectedOffice ?? null);
    const loadedByParentRef = useRef<Record<string, boolean>>({});
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
    const [searchText, setSearchText] = useState<string>('');
    const [searchLoading, setSearchLoading] = useState<boolean>(false);
    const [searchResults, setSearchResults] = useState<OfficeNode[] | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [, startExpandTransition] = useTransition();
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    // ── Helpers ────────────────────────────────────────────────────────────────

    const getRootNodes = useCallback((offices: OfficeNode[]): OfficeNode[] => {
        if (!offices?.length) return [];
        return offices.filter(o => !(o.idcaptren || o.idCapTren || o.id_cap_tren || o.IDCapTren));
    }, []);

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchNodes = useCallback(async (parentId?: string | number | null) => {
        const parentKey = parentId != null ? String(parentId) : ROOT_KEY;

        if (officeNodeCache.has(parentKey)) {
            const cached = officeNodeCache.get(parentKey)!;
            startTransition(() => {
                setNodesByParent(prev => ({ ...prev, [parentKey]: cached }));
                setNodeMap(prev => {
                    const next = { ...prev };
                    cached.forEach(n => { if (n.id != null) next[String(n.id)] = n; });
                    return next;
                });
            });
            loadedByParentRef.current[parentKey] = true;
            return;
        }

        setLoadingByParent(prev => ({ ...prev, [parentKey]: true }));
        try {
            const result = await officeApi.getListOffices(
                parentId ? { parentID: String(parentId), loadAll: false } : undefined
            );
            const children: OfficeNode[] = result || [];
            officeNodeCache.set(parentKey, children);

            startTransition(() => {
                setNodesByParent(prev => ({ ...prev, [parentKey]: children }));
                setNodeMap(prev => {
                    const next = { ...prev };
                    children.forEach(n => { if (n.id != null) next[String(n.id)] = n; });
                    return next;
                });
            });
            loadedByParentRef.current[parentKey] = true;
            setError(null);
        } catch (err) {
            console.error('[fetchNodes] Error:', err);
            setError('Không thể tải danh sách đơn vị');
        } finally {
            setLoadingByParent(prev => ({ ...prev, [parentKey]: false }));
        }
    }, []);

    // ── Refresh (exposed qua ref) ──────────────────────────────────────────────

    const refreshChildrenForParent = useCallback(async (parentId?: string | number | null) => {
        const key = parentId == null ? ROOT_KEY : String(parentId);

        officeNodeCache.delete(key);
        delete loadedByParentRef.current[key];

        try {
            const children = await officeApi.getListOffices({
                parentID: key === ROOT_KEY ? '' : key,
                loadAll: false,
                inIDs: [],
                searchText: '',
            });

            const serialized = (Array.isArray(children) ? children : [])
                .map(c => serializeProtoObject(c) as unknown as OfficeNode);

            setNodesByParent(prev => ({ ...prev, [key]: serialized }));

            setNodeMap(prev => {
                const next = { ...prev };
                for (const node of serialized) {
                    const nid = node.id?.toString() ?? '';
                    if (nid) next[nid] = node;
                }
                return next;
            });

            loadedByParentRef.current[key] = true;

        } catch (error) {
            console.error('[OfficeDictionary] refreshChildrenForParent error:', error);
        }
    }, []);

    const refreshNode = useCallback(async (nodeId: string | number) => {
        const id = String(nodeId);
        try {
            const freshNode = await officeApi.getOffice(id);
            if (!freshNode) return;

            const serialized = serializeProtoObject(freshNode) as unknown as OfficeNode;

            setNodesByParent(prev => {
                const next: NodesByParent = { ...prev };
                for (const key of Object.keys(next)) {
                    const idx = next[key].findIndex(n => n.id?.toString() === id);
                    if (idx !== -1) {
                        const updated = [...next[key]];
                        updated[idx] = serialized;
                        next[key] = updated;
                        break;
                    }
                }
                return next;
            });

            setNodeMap(prev => ({ ...prev, [id]: serialized }));
            officeNodeCache.delete(id);

        } catch (error) {
            console.error('[OfficeDictionary] refreshNode error:', error);
        }
    }, []);

    const refreshNodeAndChildren = useCallback(async (nodeId: string | number) => {
        await refreshNode(nodeId);
        await refreshChildrenForParent(nodeId);
    }, [refreshNode, refreshChildrenForParent]);

    const refreshTree = useCallback(() => {
        officeNodeCache.clear();
        loadedByParentRef.current = {};
        setNodesByParent({ [ROOT_KEY]: [] });
        setNodeMap({});
        setExpandedSet(new Set());
        setRefreshTrigger(prev => prev + 1);
    }, []);

    const removeNode = useCallback((nodeId: string | number) => {
        const id = String(nodeId);

        const parentId = (() => {
            for (const key of Object.keys(nodesByParent)) {
                const found = nodesByParent[key].find(n => n.id?.toString() === id);
                if (found) return key;
            }
            return null;
        })();

        officeNodeCache.delete(id);
        delete loadedByParentRef.current[id];

        setNodesByParent(prev => {
            const next: NodesByParent = {};
            for (const key of Object.keys(prev)) {
                next[key] = prev[key].filter(n => n.id?.toString() !== id);
            }
            delete next[id];

            // Nếu parent hết con → coCapDuoi = false
            if (parentId && parentId !== ROOT_KEY) {
                const siblings = next[parentId] || [];
                if (siblings.length === 0) {
                    for (const key of Object.keys(next)) {
                        const idx = next[key].findIndex(n => n.id?.toString() === parentId);
                        if (idx !== -1) {
                            const updated = [...next[key]];
                            updated[idx] = { ...updated[idx], coCapDuoi: false, cocapduoi: false };
                            next[key] = updated;
                            break;
                        }
                    }
                }
            }

            return next;
        });

        setNodeMap(prev => {
            const next = { ...prev };
            delete next[id];
            return next;
        });

        setExpandedSet(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });

    }, [nodesByParent]);

    React.useImperativeHandle(ref, () => ({
        refreshChildrenForParent,
        refreshNode,
        refreshTree,
        refreshNodeAndChildren,
        removeNode,
    }), [refreshChildrenForParent, refreshNode, refreshTree, refreshNodeAndChildren, removeNode]);

    // ── Init từ initialOffices (đọc từ context hoặc props) ──────────────
    useEffect(() => {
        if (!initialOffices?.length) return;

        const rootNodes = getRootNodes(initialOffices);

        const map: Record<string, OfficeNode> = {};
        initialOffices.forEach(n => { if (n.id != null) map[String(n.id)] = n; });

        const byParent: NodesByParent = { [ROOT_KEY]: rootNodes };
        initialOffices.forEach(n => {
            const parentId = (n.idCapTren || n.idcaptren || n.IDCapTren) as string | undefined;
            if (parentId) {
                if (!byParent[parentId]) byParent[parentId] = [];
                const siblings = byParent[parentId];   // cache ref, tránh 3 lần lookup
                if (!siblings.find(x => x.id === n.id)) {
                    siblings.push(n);
                }
            }
        });

        setNodesByParent(prev => {
            const next = { ...prev };
            for (const key of Object.keys(byParent)) {
                next[key] = byParent[key];
            }
            return next;
        });

        setNodeMap(prev => ({ ...prev, ...map }));
        loadedByParentRef.current[ROOT_KEY] = true;
        setError(null);

    }, [initialOffices, refreshTrigger, getRootNodes]);   // ← initialOffices thay đổi khi context load xong

    // ── Expand toggle ──────────────────────────────────────────────────────────

    const handleToggleExpand = useCallback((itemId: string) => {
        let willExpand = false;
        setExpandedSet(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) { next.delete(itemId); }
            else { next.add(itemId); willExpand = true; }
            return next;
        });
        if (willExpand && !loadedByParentRef.current[itemId] && !loadingByParent[itemId]) {
            startExpandTransition(() => { fetchNodes(itemId); });
        }
    }, [loadingByParent, fetchNodes, startExpandTransition]);

    // ── FIX: sync internalSelected khi selectedOffice prop thay đổi từ ngoài ──
    useEffect(() => {
        if (String(selectedOffice?.id ?? '') !== String(internalSelected?.id ?? '')) {
            setInternalSelected(selectedOffice ?? null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedOffice]);

    const handleSelect = useCallback((node: OfficeNode) => {
        // Rule: functional-setstate — đọc prev trong functional update, bỏ internalSelected khỏi deps
        setInternalSelected(prev => {
            if (String(node.id) === String(prev?.id)) return prev;  // same → no re-render
            return node;
        });

        // Props callback (khi dùng từ Employee page)
        onSelect?.(node);
        onSelectOffice?.(node);

        // Không có props callback → báo lên context qua actions.selectOffice
        if (!onSelect && !onSelectOffice) {
            officeCtx?.actions.selectOffice(node);   // ← actions.selectOffice
        }
    }, [onSelect, onSelectOffice, officeCtx]);  //  bỏ internalSelected khỏi deps

    // ── Search ─────────────────────────────────────────────────────────────────

    const performSearch = useCallback(async (query: string) => {
        if (!query?.trim()) { setSearchResults(null); return; }
        setSearchLoading(true);
        try {
            const result: OfficeNode[] = await officeApi.getListOffices({ searchText: query.trim() });
            setSearchResults(result || []);
            if (result?.length) {
                setNodeMap(prev => {
                    const next = { ...prev };
                    result.forEach(n => { if (n.id != null) next[String(n.id)] = n; });
                    return next;
                });
            }
        } catch (err) {
            console.error('[Search] Error:', err);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!searchText?.trim()) { setSearchResults(null); return; }
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => performSearch(searchText), 500);
        return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
    }, [searchText, performSearch]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            performSearch(searchText);
        }
    }, [searchText, performSearch]);

    const handleSearchClick = useCallback(() => {
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        performSearch(searchText);
    }, [searchText, performSearch]);

    const handleClearSearch = useCallback(() => {
        setSearchText('');
        setSearchResults(null);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    }, []);

    // ── Visible list ───────────────────────────────────────────────────────────

    const isSearchMode = !!searchText?.trim();
    const rootNodes = useMemo(() => nodesByParent[ROOT_KEY] || [], [nodesByParent]);
    const loadingRoot = loadingByParent[ROOT_KEY];
    const displayCount = isSearchMode ? (searchResults?.length ?? 0) : rootNodes.length;

    const visibleList = useMemo<VisibleRow[]>(() => {
        if (isSearchMode) {
            return (searchResults || []).map(node => ({
                node, depth: 0, isExpanded: false, isLoading: false, canExpand: false,
            }));
        }
        return computeVisibleList(nodesByParent, expandedSet, loadingByParent);
    }, [isSearchMode, searchResults, nodesByParent, expandedSet, loadingByParent]);

    // ── Virtualization ─────────────────────────────────────────────────────────

    const virtualizer = useVirtualizer({
        count: visibleList.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 10,
    });

    const selectedId = internalSelected?.id?.toString() ?? selectedOffice?.id?.toString();

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <Box sx={{ width: '100%', minWidth: 0, boxShadow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fafafa', height: '100%', overflow: 'hidden' }}>

            {/* Search bar */}
            <Box sx={{ p: 2, pb: 1, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
                <TextField
                    size="small" fullWidth
                    placeholder="Tìm kiếm đơn vị (nhấn Enter)..."
                    value={searchText}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={searchLoading}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                {searchLoading ? <CircularProgress size={18} /> : (
                                    <IconButton size="small" edge="start" onClick={handleSearchClick}
                                        disabled={!searchText?.trim()}
                                        sx={{ '&:hover': { backgroundColor: 'rgba(25,118,210,0.08)' } }}
                                    >
                                        <Search fontSize="small" />
                                    </IconButton>
                                )}
                            </InputAdornment>
                        ),
                        endAdornment: searchText && (
                            <InputAdornment position="end">
                                <IconButton size="small" edge="end" onClick={handleClearSearch} disabled={searchLoading}>
                                    <Clear fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        )
                    }}
                    sx={{ mb: 1 }}
                />
                {(rootNodes.length > 0 || searchResults) && (
                    <Typography variant="caption" sx={{ color: '#757575', fontSize: '0.875rem' }}>
                        {isSearchMode
                            ? (searchLoading ? 'Đang tìm kiếm...' : `Tìm thấy ${displayCount} đơn vị`)
                            : `${displayCount} đơn vị`}
                    </Typography>
                )}
            </Box>

            {/* Virtualized tree */}
            <Box sx={{ flex: 1, overflow: 'hidden', px: 1, py: 1 }}>
                {loadingRoot || searchLoading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '200px', gap: 2 }}>
                        <CircularProgress />
                        <Typography variant="body2" color="text.secondary">
                            {searchLoading ? 'Đang tìm kiếm...' : 'Đang tải danh sách đơn vị...'}
                        </Typography>
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : visibleList.length === 0 ? (
                    <Alert severity="info">
                        {isSearchMode ? 'Không tìm thấy đơn vị phù hợp' : 'Không có dữ liệu đơn vị'}
                    </Alert>
                ) : (
                    <div ref={scrollContainerRef} style={{ height: '100%', overflow: 'auto' }}>
                        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
                            {virtualizer.getVirtualItems().map(virtualRow => {
                                const row = visibleList[virtualRow.index];
                                return (
                                    <VirtualTreeRow
                                        key={virtualRow.key}
                                        row={row}
                                        isSelected={!!(row as TreeRow).node && (row as TreeRow).node?.id?.toString() === selectedId}
                                        onToggleExpand={handleToggleExpand}
                                        onSelect={handleSelect}
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
});

OfficeDictionary.displayName = 'OfficeDictionary';
export default OfficeDictionary;
//export type { OfficeDictionaryRef, OfficeNode, OfficeDictionaryProps };

