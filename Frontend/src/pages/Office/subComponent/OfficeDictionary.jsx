import React, { useEffect, useMemo, useState, useCallback, useRef, useTransition, startTransition } from 'react';
import { Box, Typography, CircularProgress, Alert, TextField, InputAdornment, IconButton } from '@mui/material';
import { ExpandMore, ChevronRight, Search, Clear } from '@mui/icons-material';
import { useVirtualizer } from '@tanstack/react-virtual';
import officeApi from '../../../apis/officeApi';

// [js-cache-function-results] Module-level cache â€” sá»‘ng suá»‘t session, khÃ´ng reset khi unmount
const officeNodeCache = new Map();
const ROOT_KEY   = 'root';
const ROW_HEIGHT = 40; // px â€” chiá»u cao cá»‘ Ä‘á»‹nh má»—i dÃ²ng trong virtualized list

// â”€â”€ TÃ­nh danh sÃ¡ch pháº³ng cÃ¡c node Ä‘ang visible â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Chá»‰ walk qua nhÃ¡nh Ä‘ang expanded â†’ O(visible) thay vÃ¬ O(total)
function computeVisibleList(nodesByParent, expandedSet, loadingByParent, parentKey = ROOT_KEY, depth = 0) {
    const nodes = nodesByParent[parentKey] || [];
    const rows  = [];
    for (const node of nodes) {
        const id         = node.id?.toString();
        const isExpanded = expandedSet.has(id);
        const isLoading  = !!loadingByParent[id];
        const childNodes = nodesByParent[id];
        const coCapDuoi  = node.cocapduoi ?? node.coCapDuoi ?? node.CoCapDuoi ?? false;
        const canExpand  = coCapDuoi || !!(childNodes && childNodes.length > 0);

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

// â”€â”€ Row component â€” memo: chá»‰ re-render khi chÃ­nh row Ä‘Ã³ Ä‘á»•i â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const VirtualTreeRow = React.memo(function VirtualTreeRow({ row, isSelected, onToggleExpand, onSelect, style }) {
    if (row.loading) {
        return (
            <Box sx={{ ...style, display: 'flex', alignItems: 'center', pl: `${row.depth * 20 + 28}px`, gap: 1 }}>
                <CircularProgress size={14} />
                <Typography variant="body2" sx={{ color: '#757575', fontSize: '0.875rem' }}>Äang táº£i...</Typography>
            </Box>
        );
    }

    const { node, depth, isExpanded, canExpand } = row;
    const id  = node.id?.toString();
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
                onClick={canExpand ? (e) => { e.stopPropagation(); onToggleExpand(id); } : undefined}
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
                {ten}
            </Typography>
        </Box>
    );
});

const OfficeDictionary = React.forwardRef((props, ref) => {
    const { onSelect, onSelectOffice, selectedOffice, offices: initialOffices = [] } = props;

    const [nodesByParent, setNodesByParent]     = useState({ [ROOT_KEY]: [] });
    const [nodeMap, setNodeMap]                 = useState({});
    // Set thay vÃ¬ array: O(1) lookup khi check expanded, khÃ´ng pháº£i O(n)
    const [expandedSet, setExpandedSet]         = useState(() => new Set());
    const [loadingByParent, setLoadingByParent] = useState({});
    const loadedByParentRef                     = useRef({});
    const [error, setError]                     = useState(null);
    const [refreshTrigger, setRefreshTrigger]   = useState(0);
    const [searchText, setSearchText]           = useState('');
    const [searchLoading, setSearchLoading]     = useState(false);
    const [searchResults, setSearchResults]     = useState(null);
    const searchTimeoutRef                      = useRef(null);
    const [, startExpandTransition]             = useTransition();
    const scrollContainerRef                    = useRef(null);

    // â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const getRootNodes = useCallback((offices) => {
        if (!offices?.length) return [];
        return offices.filter(o => !(o.idcaptren || o.idCapTren || o.id_cap_tren || o.IDCapTren));
    }, []);

    // â”€â”€ Fetch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const fetchNodes = useCallback(async (parentId) => {
        const parentKey = parentId ?? ROOT_KEY;

        if (officeNodeCache.has(parentKey)) {
            const cached = officeNodeCache.get(parentKey);
            startTransition(() => {
                setNodesByParent(prev => ({ ...prev, [parentKey]: cached }));
                setNodeMap(prev => {
                    const next = { ...prev };
                    cached.forEach(n => { next[n.id] = n; });
                    return next;
                });
            });
            loadedByParentRef.current[parentKey] = true;
            return;
        }

        setLoadingByParent(prev => ({ ...prev, [parentKey]: true }));
        try {
            const result   = await officeApi.getListOffices(
                parentId ? { parentID: parentId, loadAll: false } : null
            );
            const children = result || [];
            officeNodeCache.set(parentKey, children);

            startTransition(() => {
                setNodesByParent(prev => ({ ...prev, [parentKey]: children }));
                setNodeMap(prev => {
                    const next = { ...prev };
                    children.forEach(n => { next[n.id] = n; });
                    return next;
                });
            });
            loadedByParentRef.current[parentKey] = true;
            setError(null);
        } catch (err) {
            console.error('[fetchNodes] Error:', err);
            setError('KhÃ´ng thá»ƒ táº£i danh sÃ¡ch Ä‘Æ¡n vá»‹');
        } finally {
            setLoadingByParent(prev => ({ ...prev, [parentKey]: false }));
        }
    }, []);

    // â”€â”€ Refresh (exposed qua ref) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const refreshChildrenForParent = useCallback(async (parentId) => {
        const parentKey = parentId ?? ROOT_KEY;
        officeNodeCache.delete(parentKey);
        delete loadedByParentRef.current[parentKey];
        setExpandedSet(new Set());
        setLoadingByParent(prev => { const n = { ...prev }; delete n[parentKey]; return n; });
        setNodesByParent(prev => { const n = { ...prev }; delete n[parentKey]; return n; });
        await fetchNodes(parentId);
    }, [fetchNodes]);

    const refreshNode = useCallback(async (nodeId) => {
        try {
            const nodeData = await officeApi.getOffice(nodeId);
            setNodeMap(prev => ({ ...prev, [nodeId]: nodeData }));
            if (selectedOffice?.id === nodeId && onSelectOffice) onSelectOffice(nodeData);
            setExpandedSet(new Set());
            setNodesByParent(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(pk => {
                    next[pk] = next[pk].map(n =>
                        n.id?.toString() === nodeId?.toString() ? { ...n, ...nodeData } : n
                    );
                });
                return next;
            });
        } catch (err) {
            console.error('[refreshNode] Error:', err);
        }
    }, [selectedOffice, onSelectOffice]);

    const refreshNodeAndChildren = useCallback(async (nodeId) => {
        await refreshNode(nodeId);
        await refreshChildrenForParent(nodeId);
    }, [refreshNode, refreshChildrenForParent]);

    const refreshTree = useCallback(() => {
        officeNodeCache.clear();
        loadedByParentRef.current = {};
        setExpandedSet(new Set());
        setRefreshTrigger(prev => prev + 1);
    }, []);

    React.useImperativeHandle(ref, () => ({
        refreshChildrenForParent,
        refreshNode,
        refreshTree,
        refreshNodeAndChildren,
    }), [refreshChildrenForParent, refreshNode, refreshTree, refreshNodeAndChildren]);

    // â”€â”€ Init tá»« initialOffices â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    useEffect(() => {
        if (!initialOffices?.length) return;
        const rootNodes = getRootNodes(initialOffices);
        setNodesByParent({ [ROOT_KEY]: rootNodes });
        const map = {};
        rootNodes.forEach(n => { map[n.id] = n; });
        setNodeMap(map);
        loadedByParentRef.current[ROOT_KEY] = true;
        setError(null);
    }, [initialOffices, refreshTrigger, getRootNodes]);

    // â”€â”€ Expand toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const handleToggleExpand = useCallback((itemId) => {
        let willExpand = false;
        setExpandedSet(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) { next.delete(itemId); }
            else { next.add(itemId); willExpand = true; }
            return next;
        });
        // Fetch children khi má»Ÿ láº§n Ä‘áº§u â€” fetchNodes tá»± dÃ¹ng startTransition bÃªn trong
        if (willExpand && !loadedByParentRef.current[itemId] && !loadingByParent[itemId]) {
            startExpandTransition(() => { fetchNodes(itemId); });
        }
    }, [loadingByParent, fetchNodes, startExpandTransition]);

    const handleSelect = useCallback((node) => {
        if (typeof onSelect === 'function') onSelect(node);
        else if (typeof onSelectOffice === 'function') onSelectOffice(node);
    }, [onSelect, onSelectOffice]);

    // â”€â”€ Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const performSearch = useCallback(async (query) => {
        if (!query?.trim()) { setSearchResults(null); return; }
        setSearchLoading(true);
        try {
            const result = await officeApi.getListOffices({ searchText: query.trim() });
            setSearchResults(result || []);
            if (result?.length) {
                setNodeMap(prev => {
                    const next = { ...prev };
                    result.forEach(n => { next[n.id] = n; });
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

    const handleKeyDown = useCallback((e) => {
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

    // â”€â”€ Danh sÃ¡ch visible (pháº³ng) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    const isSearchMode = !!searchText?.trim();
    const rootNodes    = useMemo(() => nodesByParent[ROOT_KEY] || [], [nodesByParent]);
    const loadingRoot  = loadingByParent[ROOT_KEY];
    const displayCount = isSearchMode ? (searchResults?.length ?? 0) : rootNodes.length;

    // computeVisibleList chá»‰ walk nhá»¯ng nhÃ¡nh expanded â†’ khÃ´ng duyá»‡t toÃ n bá»™ cÃ¢y
    const visibleList = useMemo(() => {
        if (isSearchMode) {
            return (searchResults || []).map(node => ({
                node, depth: 0, isExpanded: false, isLoading: false, canExpand: false,
            }));
        }
        return computeVisibleList(nodesByParent, expandedSet, loadingByParent);
    }, [isSearchMode, searchResults, nodesByParent, expandedSet, loadingByParent]);

    // â”€â”€ Virtualization â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    // Chá»‰ render rows trong viewport (â‰ˆ viewportHeight / ROW_HEIGHT rows)
    // thay vÃ¬ toÃ n bá»™ cÃ¢y â†’ tá»‘c Ä‘á»™ khÃ´ng Ä‘á»•i dÃ¹ cÃ³ 10 hay 10 000 node

    const virtualizer = useVirtualizer({
        count:            visibleList.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize:     () => ROW_HEIGHT,
        overscan:         10,
    });

    const selectedId = selectedOffice?.id?.toString();

    // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

    return (
        <Box sx={{ width: '100%', minWidth: 0, boxShadow: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#fafafa', height: '100%', overflow: 'hidden' }}>

            {/* Search bar */}
            <Box sx={{ p: 2, pb: 1, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
                <TextField
                    size="small" fullWidth
                    placeholder="TÃ¬m kiáº¿m Ä‘Æ¡n vá»‹ (nháº¥n Enter)..."
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
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
                            ? (searchLoading ? 'Äang tÃ¬m kiáº¿m...' : `TÃ¬m tháº¥y ${displayCount} Ä‘Æ¡n vá»‹`)
                            : `${displayCount} Ä‘Æ¡n vá»‹`}
                    </Typography>
                )}
            </Box>

            {/* Virtualized tree */}
            <Box sx={{ flex: 1, overflow: 'hidden', px: 1, py: 1 }}>
                {loadingRoot || searchLoading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '200px', gap: 2 }}>
                        <CircularProgress />
                        <Typography variant="body2" color="text.secondary">
                            {searchLoading ? 'Äang tÃ¬m kiáº¿m...' : 'Äang táº£i danh sÃ¡ch Ä‘Æ¡n vá»‹...'}
                        </Typography>
                    </Box>
                ) : error ? (
                    <Alert severity="error">{error}</Alert>
                ) : visibleList.length === 0 ? (
                    <Alert severity="info">
                        {isSearchMode ? 'KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n vá»‹ phÃ¹ há»£p' : 'KhÃ´ng cÃ³ dá»¯ liá»‡u Ä‘Æ¡n vá»‹'}
                    </Alert>
                ) : (
                    /* Scroll container: useVirtualizer láº¥y height tá»« Ä‘Ã¢y Ä‘á»ƒ tÃ­nh viewport */
                    <div ref={scrollContainerRef} style={{ height: '100%', overflow: 'auto' }}>
                        {/* Tá»•ng chiá»u cao áº£o = tá»•ng sá»‘ row Ã— ROW_HEIGHT */}
                        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative', width: '100%' }}>
                            {virtualizer.getVirtualItems().map(virtualRow => {
                                const row = visibleList[virtualRow.index];
                                return (
                                    <VirtualTreeRow
                                        key={virtualRow.key}
                                        row={row}
                                        isSelected={!!row.node && row.node.id?.toString() === selectedId}
                                        onToggleExpand={handleToggleExpand}
                                        onSelect={handleSelect}
                                        style={{
                                            position: 'absolute',
                                            top:      `${virtualRow.start}px`,
                                            width:    '100%',
                                            height:   `${ROW_HEIGHT}px`,
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
