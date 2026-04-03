import React, {
    useEffect, useMemo, useState, useCallback, useRef,
    useTransition, startTransition, CSSProperties, useContext, SetStateAction,
} from 'react';


import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Search from '@mui/icons-material/Search';
import Clear from '@mui/icons-material/Clear';
import { useTheme } from '@mui/material/styles';

import { useVirtualizer } from '@tanstack/react-virtual';
import officeApi from '../../../apis/officeApi';
import { serializeProtoObject } from '../../../utils/serializeProto';
import OfficeContext from '../../../context/OfficeContext';



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

function getNodeId(node: OfficeNode): string {
    return node.id?.toString() ?? '';
}

function getParentNodeId(node: OfficeNode): string | null {
    const parentId = node.idcaptren || node.idCapTren || node.id_cap_tren || node.IDCapTren;
    return parentId ? String(parentId) : null;
}

function hasChildren(node: OfficeNode): boolean {
    return Boolean(node.cocapduoi ?? node.coCapDuoi ?? node.CoCapDuoi ?? false);
}

function isLoadingRow(row: VisibleRow): row is LoadingRow {
    return 'loading' in row;
}

function isTreeRow(row: VisibleRow): row is TreeRow {
    return 'node' in row;
}

function useSyncedStateRef<T>(initialState: T): [T, React.MutableRefObject<T>, (nextValue: SetStateAction<T>) => T] {
    const [state, setState] = useState<T>(initialState);
    const stateRef = useRef<T>(initialState);

    const setSyncedState = useCallback((nextValue: SetStateAction<T>) => {
        const next = typeof nextValue === 'function'
            ? (nextValue as (prev: T) => T)(stateRef.current)
            : nextValue;

        stateRef.current = next;
        setState(next);
        return next;
    }, []);

    return [state, stateRef, setSyncedState];
}

// ── computeVisibleList ─────────────────────────────────────────────────────────

function computeVisibleList(
    nodesByParent: NodesByParent,
    expandedSet: Set<string>,
    loadingByParent: LoadingByParent,
    parentKey: string = ROOT_KEY,
    depth: number = 0,
): VisibleRow[] {
    const rows: VisibleRow[] = [];

    const appendRows = (currentParentKey: string, currentDepth: number) => {
        const nodes = nodesByParent[currentParentKey] || [];

        for (const node of nodes) {
            const id = getNodeId(node);
            const isExpanded = expandedSet.has(id);
            const isLoading = !!loadingByParent[id];
            const childNodes = nodesByParent[id];
            const canExpand = hasChildren(node) || !!(childNodes && childNodes.length > 0);

            rows.push({ node, depth: currentDepth, isExpanded, isLoading, canExpand });

            if (isExpanded) {
                if (isLoading) {
                    rows.push({ loading: true, depth: currentDepth + 1 });
                } else {
                    appendRows(id, currentDepth + 1);
                }
            }
        }
    };

    appendRows(parentKey, depth);

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
    const theme = useTheme();
    if ((row as LoadingRow).loading) {
        const loadingRow = row as LoadingRow;
        return (
            <Box sx={{ ...style, display: 'flex', alignItems: 'center', pl: `${loadingRow.depth * 20 + 28}px`, gap: 1 }}>
                <CircularProgress size={14} />
                <Typography variant="body2" sx={{ color: '#757575', fontSize: '0.875rem' }}>Đang tải…</Typography>
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
                borderRadius: 2.5,
                backgroundColor: isSelected ? `${theme.palette.primary.main}15` : 'transparent',
                '&:hover': { backgroundColor: isSelected ? `${theme.palette.primary.main}25` : theme.palette.action.hover },
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                userSelect: 'none',
                mb: 0.25,
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
                sx={{
                    fontSize: '0.925rem',
                    fontWeight: isSelected ? 700 : 400,
                    flex: 1,
                    minWidth: 0,
                    color: isSelected ? theme.palette.primary.main : 'text.primary'
                }}
            >
                {ten as string}
            </Typography>
        </Box>
    );
});

// ── OfficeDictionary ───────────────────────────────────────────────────────────

const OfficeDictionary = React.forwardRef<OfficeDictionaryRef, OfficeDictionaryProps>((props, ref) => {
    const theme = useTheme();
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

    const [nodesByParent, nodesByParentRef, setNodesByParentSynced] = useSyncedStateRef<NodesByParent>({ [ROOT_KEY]: [] });
    const [expandedSet, expandedSetRef, setExpandedSetSynced] = useSyncedStateRef<Set<string>>(new Set());
    const [loadingByParent, loadingByParentRef, setLoadingByParentSynced] = useSyncedStateRef<LoadingByParent>({});
    const [visibleTreeRows, visibleTreeRowsRef, setVisibleTreeRowsSynced] = useSyncedStateRef<VisibleRow[]>([]);
    const [internalSelected, setInternalSelected] = useState<OfficeNode | null>(selectedOffice ?? null);
    const loadedByParentRef = useRef<Record<string, boolean>>({});
    const nodeMapRef = useRef<Record<string, OfficeNode>>({});
    const parentByNodeIdRef = useRef<Record<string, string>>({});
    const [error, setError] = useState<string | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
    const [searchText, setSearchText] = useState<string>('');
    const [searchLoading, setSearchLoading] = useState<boolean>(false);
    const [searchResults, setSearchResults] = useState<OfficeNode[] | null>(null);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchRequestIdRef = useRef<number>(0);
    const [, startExpandTransition] = useTransition();
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    // ── Helpers ────────────────────────────────────────────────────────────────

    const getRootNodes = useCallback((offices: OfficeNode[]): OfficeNode[] => {
        if (!offices?.length) return [];
        return offices.filter(o => !(o.idcaptren || o.idCapTren || o.id_cap_tren || o.IDCapTren));
    }, []);

    const indexNodes = useCallback((nodes: OfficeNode[], parentKey: string) => {
        for (const node of nodes) {
            const id = getNodeId(node);
            if (!id) continue;
            nodeMapRef.current[id] = node;
            parentByNodeIdRef.current[id] = parentKey;
        }
    }, []);

    const findVisibleRowIndex = useCallback((rows: VisibleRow[], nodeId: string) => {
        return rows.findIndex(row => isTreeRow(row) && getNodeId(row.node) === nodeId);
    }, []);

    const getVisibleDescendantCount = useCallback((rows: VisibleRow[], parentIndex: number) => {
        const parentRow = rows[parentIndex];
        if (!parentRow || !isTreeRow(parentRow)) {
            return 0;
        }

        const parentDepth = parentRow.depth;
        let count = 0;
        for (let index = parentIndex + 1; index < rows.length; index += 1) {
            if (rows[index].depth <= parentDepth) {
                break;
            }
            count += 1;
        }

        return count;
    }, []);

    const getTreeRowMeta = useCallback((node: OfficeNode, depth: number): TreeRow => {
        const id = getNodeId(node);
        const childNodes = nodesByParentRef.current[id];

        return {
            node,
            depth,
            isExpanded: expandedSetRef.current.has(id),
            isLoading: !!loadingByParentRef.current[id],
            canExpand: hasChildren(node) || !!(childNodes && childNodes.length > 0),
        };
    }, []);

    const rebuildVisibleTree = useCallback(() => {
        setVisibleTreeRowsSynced(computeVisibleList(
            nodesByParentRef.current,
            expandedSetRef.current,
            loadingByParentRef.current,
        ));
    }, [setVisibleTreeRowsSynced]);

    const syncVisibleBranch = useCallback((parentKey: string) => {
        if (parentKey === ROOT_KEY) {
            rebuildVisibleTree();
            return;
        }

        setVisibleTreeRowsSynced(prev => {
            const parentIndex = findVisibleRowIndex(prev, parentKey);
            if (parentIndex === -1) {
                return prev;
            }

            const currentParentRow = prev[parentIndex];
            if (!isTreeRow(currentParentRow)) {
                return prev;
            }

            const nextRows = [...prev];
            const nextParentRow = getTreeRowMeta(currentParentRow.node, currentParentRow.depth);
            nextRows[parentIndex] = nextParentRow;

            const descendantCount = getVisibleDescendantCount(nextRows, parentIndex);
            const branchRows: VisibleRow[] = nextParentRow.isExpanded
                ? (nextParentRow.isLoading
                    ? [{ loading: true, depth: nextParentRow.depth + 1 } as LoadingRow]
                    : computeVisibleList(
                        nodesByParentRef.current,
                        expandedSetRef.current,
                        loadingByParentRef.current,
                        parentKey,
                        nextParentRow.depth + 1,
                    ))
                : [];

            nextRows.splice(parentIndex + 1, descendantCount, ...branchRows);
            return nextRows;
        });
    }, [findVisibleRowIndex, getTreeRowMeta, getVisibleDescendantCount, rebuildVisibleTree, setVisibleTreeRowsSynced]);

    const syncVisibleNode = useCallback((nodeId: string) => {
        setVisibleTreeRowsSynced(prev => {
            const rowIndex = findVisibleRowIndex(prev, nodeId);
            if (rowIndex === -1) {
                return prev;
            }

            const currentRow = prev[rowIndex];
            if (!isTreeRow(currentRow)) {
                return prev;
            }

            const nextNode = nodeMapRef.current[nodeId] ?? currentRow.node;
            const nextRow = getTreeRowMeta(nextNode, currentRow.depth);
            const nextRows = [...prev];
            nextRows[rowIndex] = nextRow;
            return nextRows;
        });
    }, [findVisibleRowIndex, getTreeRowMeta, setVisibleTreeRowsSynced]);

    const removeNodeIndexes = useCallback((nodeId: string) => {
        const stack = [nodeId];

        while (stack.length > 0) {
            const currentId = stack.pop();
            if (!currentId) continue;

            const children = nodesByParentRef.current[currentId] || [];
            children.forEach(child => {
                const childId = getNodeId(child);
                if (childId) {
                    stack.push(childId);
                }
            });

            delete nodeMapRef.current[currentId];
            delete parentByNodeIdRef.current[currentId];
            delete loadedByParentRef.current[currentId];
            officeNodeCache.delete(currentId);
        }
    }, []);

    const collectSubtreeNodeIds = useCallback((nodeId: string, source: NodesByParent = nodesByParentRef.current) => {
        const collectedIds: string[] = [];
        const stack = [nodeId];

        while (stack.length > 0) {
            const currentId = stack.pop();
            if (!currentId) continue;

            collectedIds.push(currentId);
            const children = source[currentId] || [];
            children.forEach(child => {
                const childId = getNodeId(child);
                if (childId) {
                    stack.push(childId);
                }
            });
        }

        return collectedIds;
    }, []);

    const findParentKeyForNode = useCallback((nodeId: string, source: NodesByParent = nodesByParentRef.current): string | null => {
        const indexedParentKey = parentByNodeIdRef.current[nodeId];
        if (indexedParentKey && source[indexedParentKey]?.some(node => getNodeId(node) === nodeId)) {
            return indexedParentKey;
        }

        for (const key of Object.keys(source)) {
            if (source[key].some(node => getNodeId(node) === nodeId)) {
                parentByNodeIdRef.current[nodeId] = key;
                return key;
            }
        }

        return null;
    }, []);

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchNodes = useCallback(async (parentId?: string | number | null) => {
        const parentKey = parentId != null ? String(parentId) : ROOT_KEY;

        if (officeNodeCache.has(parentKey)) {
            const cached = officeNodeCache.get(parentKey)!;
            indexNodes(cached, parentKey);
            startTransition(() => {
                setNodesByParentSynced(prev => ({ ...prev, [parentKey]: cached }));
                if (parentKey === ROOT_KEY || expandedSetRef.current.has(parentKey)) {
                    syncVisibleBranch(parentKey);
                }
            });
            loadedByParentRef.current[parentKey] = true;
            return;
        }

        setLoadingByParentSynced(prev => ({ ...prev, [parentKey]: true }));
        if (parentKey !== ROOT_KEY && expandedSetRef.current.has(parentKey)) {
            syncVisibleBranch(parentKey);
        }
        try {
            const result = await officeApi.getListOffices(
                parentId ? { parentID: String(parentId), loadAll: false } : undefined
            );
            const children: OfficeNode[] = result || [];
            officeNodeCache.set(parentKey, children);
            indexNodes(children, parentKey);

            startTransition(() => {
                setNodesByParentSynced(prev => ({ ...prev, [parentKey]: children }));
                if (parentKey === ROOT_KEY || expandedSetRef.current.has(parentKey)) {
                    syncVisibleBranch(parentKey);
                }
            });
            loadedByParentRef.current[parentKey] = true;
            setError(null);
        } catch (err) {
            console.error('[fetchNodes] Error:', err);
            setError('Không thể tải danh sách đơn vị');
        } finally {
            setLoadingByParentSynced(prev => ({ ...prev, [parentKey]: false }));
            if (parentKey === ROOT_KEY || expandedSetRef.current.has(parentKey)) {
                syncVisibleBranch(parentKey);
            }
        }
    }, [indexNodes, setLoadingByParentSynced, setNodesByParentSynced, syncVisibleBranch]);

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

            indexNodes(serialized, key);

            setNodesByParentSynced(prev => ({ ...prev, [key]: serialized }));
            syncVisibleBranch(key);

            loadedByParentRef.current[key] = true;

        } catch (error) {
            console.error('[OfficeDictionary] refreshChildrenForParent error:', error);
        }
    }, [indexNodes, setNodesByParentSynced, syncVisibleBranch]);

    const refreshNode = useCallback(async (nodeId: string | number) => {
        const id = String(nodeId);
        try {
            const freshNode = await officeApi.getOffice(id);
            if (!freshNode) return;

            const serialized = serializeProtoObject(freshNode) as unknown as OfficeNode;
            const parentKey = findParentKeyForNode(id);

            nodeMapRef.current[id] = serialized;
            if (parentKey) {
                parentByNodeIdRef.current[id] = parentKey;
            }

            const nextNodesByParent = setNodesByParentSynced(prev => {
                const resolvedParentKey = parentKey ?? findParentKeyForNode(id, prev);
                if (!resolvedParentKey) {
                    return prev;
                }

                const siblings = prev[resolvedParentKey] || [];
                const idx = siblings.findIndex(n => getNodeId(n) === id);
                if (idx === -1) {
                    return prev;
                }

                const updated = [...siblings];
                updated[idx] = serialized;

                return { ...prev, [resolvedParentKey]: updated };
            });
            const resolvedParentKey = parentKey ?? findParentKeyForNode(id, nextNodesByParent);
            syncVisibleNode(id);
            if (resolvedParentKey) {
                syncVisibleBranch(resolvedParentKey);
            }
            officeNodeCache.delete(id);

        } catch (error) {
            console.error('[OfficeDictionary] refreshNode error:', error);
        }
    }, [findParentKeyForNode, setNodesByParentSynced, syncVisibleBranch, syncVisibleNode]);

    const refreshNodeAndChildren = useCallback(async (nodeId: string | number) => {
        await refreshNode(nodeId);
        await refreshChildrenForParent(nodeId);
    }, [refreshNode, refreshChildrenForParent]);

    const refreshTree = useCallback(() => {
        officeNodeCache.clear();
        loadedByParentRef.current = {};
        nodeMapRef.current = {};
        parentByNodeIdRef.current = {};
        loadingByParentRef.current = {};
        visibleTreeRowsRef.current = [];
        setNodesByParentSynced({ [ROOT_KEY]: [] });
        setExpandedSetSynced(new Set());
        setLoadingByParentSynced({});
        setVisibleTreeRowsSynced([]);
        setRefreshTrigger(prev => prev + 1);
    }, [setExpandedSetSynced, setLoadingByParentSynced, setNodesByParentSynced, setVisibleTreeRowsSynced]);

    const removeNode = useCallback((nodeId: string | number) => {
        const id = String(nodeId);
        const removedSubtreeIds = collectSubtreeNodeIds(id);

        const parentId = findParentKeyForNode(id);
        removeNodeIndexes(id);

        const nextNodesByParent = setNodesByParentSynced(prev => {
            const next: NodesByParent = { ...prev };

            for (const key of Object.keys(prev)) {
                const filtered = prev[key].filter(n => getNodeId(n) !== id);
                if (filtered.length !== prev[key].length) {
                    next[key] = filtered;
                }
            }

            delete next[id];

            // Nếu parent hết con → coCapDuoi = false
            if (parentId && parentId !== ROOT_KEY) {
                const siblings = next[parentId] || [];
                if (siblings.length === 0) {
                    const grandParentKey = findParentKeyForNode(parentId, next);
                    if (grandParentKey) {
                        const parentSiblings = next[grandParentKey] || [];
                        const idx = parentSiblings.findIndex(n => getNodeId(n) === parentId);
                        if (idx !== -1) {
                            const updated = [...parentSiblings];
                            const updatedParent = { ...updated[idx], coCapDuoi: false, cocapduoi: false };
                            updated[idx] = updatedParent;
                            next[grandParentKey] = updated;
                            nodeMapRef.current[parentId] = updatedParent;
                        }
                    }
                }
            }

            return next;
        });

        setExpandedSetSynced(prev => {
            const next = new Set(prev);
            removedSubtreeIds.forEach(removedId => next.delete(removedId));
            return next;
        });

        if (!parentId || parentId === ROOT_KEY) {
            rebuildVisibleTree();
        } else {
            syncVisibleBranch(parentId);
        }

    }, [collectSubtreeNodeIds, findParentKeyForNode, rebuildVisibleTree, removeNodeIndexes, setExpandedSetSynced, setNodesByParentSynced, syncVisibleBranch]);

    // ── Init từ initialOffices (đọc từ context hoặc props) ──────────────
    useEffect(() => {
        if (!initialOffices?.length) return;

        const rootNodes = getRootNodes(initialOffices);
        nodeMapRef.current = {};
        parentByNodeIdRef.current = {};

        const byParent: NodesByParent = { [ROOT_KEY]: rootNodes };
        initialOffices.forEach(n => {
            const parentId = getParentNodeId(n);
            const nodeId = getNodeId(n);
            if (nodeId) {
                nodeMapRef.current[nodeId] = n;
                parentByNodeIdRef.current[nodeId] = parentId ?? ROOT_KEY;
            }
            if (parentId) {
                if (!byParent[parentId]) byParent[parentId] = [];
                const siblings = byParent[parentId];   // cache ref, tránh 3 lần lookup
                if (!siblings.find(x => x.id === n.id)) {
                    siblings.push(n);
                }
            }
        });

        setNodesByParentSynced(prev => {
            const next = { ...prev };
            for (const key of Object.keys(byParent)) {
                next[key] = byParent[key];
            }
            return next;
        });
        loadedByParentRef.current[ROOT_KEY] = true;
        setError(null);
        rebuildVisibleTree();

    }, [initialOffices, rebuildVisibleTree, refreshTrigger, getRootNodes, setNodesByParentSynced]);   // ← initialOffices thay đổi khi context load xong

    // ── Self-fetch fallback: khi không có initialOffices (dùng ngoài OfficeProvider) ──
    useEffect(() => {
        if (!initialOffices?.length && !loadedByParentRef.current[ROOT_KEY]) {
            fetchNodes(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);  // chỉ chạy 1 lần khi mount

    // ── Expand toggle ──────────────────────────────────────────────────────────

    const handleToggleExpand = useCallback((itemId: string) => {
        const nextExpanded = new Set(expandedSetRef.current);
        const willExpand = !nextExpanded.has(itemId);

        if (willExpand) {
            nextExpanded.add(itemId);
        } else {
            nextExpanded.delete(itemId);
        }

        setExpandedSetSynced(nextExpanded);
        syncVisibleBranch(itemId);

        if (willExpand && !loadedByParentRef.current[itemId] && !loadingByParentRef.current[itemId]) {
            startExpandTransition(() => { fetchNodes(itemId); });
        }
    }, [fetchNodes, setExpandedSetSynced, startExpandTransition, syncVisibleBranch]);

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

    React.useImperativeHandle(ref, () => ({
        refreshChildrenForParent,
        refreshNode,
        refreshTree,
        refreshNodeAndChildren,
        removeNode,
        selectNode: (nodeId: string) => {
            const node = nodeMapRef.current[nodeId];
            if (node) {
                handleSelect(node);
            }
        },
    }), [refreshChildrenForParent, refreshNode, refreshTree, refreshNodeAndChildren, removeNode, handleSelect]);

    // ── Search ─────────────────────────────────────────────────────────────────

    const performSearch = useCallback(async (query: string) => {
        const trimmedQuery = query.trim();
        const requestId = searchRequestIdRef.current + 1;
        searchRequestIdRef.current = requestId;

        if (!trimmedQuery) {
            setSearchLoading(false);
            setSearchResults(null);
            return;
        }

        setSearchLoading(true);
        try {
            const result: OfficeNode[] = await officeApi.getListOffices({ searchText: trimmedQuery });
            if (requestId !== searchRequestIdRef.current) {
                return;
            }

            (result || []).forEach(node => {
                const nodeId = getNodeId(node);
                if (nodeId) {
                    nodeMapRef.current[nodeId] = node;
                }
            });

            setSearchResults(result || []);
        } catch (err) {
            if (requestId !== searchRequestIdRef.current) {
                return;
            }
            console.error('[Search] Error:', err);
            setSearchResults([]);
        } finally {
            if (requestId === searchRequestIdRef.current) {
                setSearchLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        if (!searchText?.trim()) {
            searchRequestIdRef.current += 1;
            setSearchLoading(false);
            setSearchResults(null);
            return;
        }
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
        searchRequestIdRef.current += 1;
        setSearchText('');
        setSearchLoading(false);
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
        return visibleTreeRows;
    }, [isSearchMode, searchResults, visibleTreeRows]);

    // ── Virtualization ─────────────────────────────────────────────────────────

    const virtualizer = useVirtualizer({
        count: visibleList.length,
        getScrollElement: () => scrollContainerRef.current,
        estimateSize: () => ROW_HEIGHT,
        getItemKey: (index) => {
            const row = visibleList[index];
            if (!row) {
                return `row-${index}`;
            }

            if ('loading' in row) {
                return `loading-${index}-${row.depth}`;
            }

            return getNodeId(row.node) || `node-${index}`;
        },
        overscan: 10,
    });

    const selectedId = internalSelected?.id?.toString() ?? selectedOffice?.id?.toString();

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <Box sx={{ width: '100%', minWidth: 0, display: 'flex', flexDirection: 'column', backgroundColor: 'background.paper', height: '100%', overflow: 'hidden' }}>

            {/* Search bar */}
            <Box sx={{ p: 2, pb: 1, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
                <TextField
                    size="small" fullWidth
                    placeholder="Tìm kiếm đơn vị (nhấn Enter)…"
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
                    sx={{
                        mb: 1,
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 2.5,
                            bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.01)',
                            '&:hover': { bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.03)' },
                        }
                    }}
                />
                {(rootNodes.length > 0 || searchResults) && (
                    <Typography variant="caption" sx={{ color: '#757575', fontSize: '0.875rem' }}>
                        {isSearchMode
                            ? (searchLoading ? 'Đang tìm kiếm…' : `Tìm thấy ${displayCount} đơn vị`)
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
                            {searchLoading ? 'Đang tìm kiếm…' : 'Đang tải danh sách đơn vị…'}
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

