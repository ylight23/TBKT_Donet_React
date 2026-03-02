import React, { useState, useEffect, useMemo } from 'react';

// ✅ Direct imports
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import InputAdornment from '@mui/material/InputAdornment';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Search from '@mui/icons-material/Search';
import Close from '@mui/icons-material/Close';

import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';



// ── Types ──────────────────────────────────────────────────────────────────────

export interface NormalizedNode {
    _id: string;
    _label: string;
    _subLabel?: string;
    _hasChildren: boolean;
    [key: string]: unknown;
}

interface TreeViewPopupProps {
    open: boolean;
    onClose: () => void;
    onSelect: (node: NormalizedNode | null) => void;
    selectedId?: string | null;
    title?: string;
    fetchRootData: () => Promise<unknown[]>;
    fetchChildrenData: (parentId: string) => Promise<unknown[]>;
    getNodeId?: (node: unknown) => string;
    getNodeLabel?: (node: unknown) => string;
    getNodeSubLabel?: (node: unknown) => string | undefined;
    hasChildren?: (node: unknown) => boolean;
    normalizeNode?: (node: unknown) => unknown;
}

type NodesByParent = Record<string, NormalizedNode[]>;
type BoolRecord = Record<string, boolean>;

const ROOT_KEY = 'root';

// ── Component ──────────────────────────────────────────────────────────────────

const TreeViewPopup: React.FC<TreeViewPopupProps> = ({
    open,
    onClose,
    onSelect,
    selectedId,
    title = "Chọn mục",
    fetchRootData,
    fetchChildrenData,
    getNodeId = (node: any) => node.id,
    getNodeLabel = (node: any) => node.ten || node.tenDayDu || node.id,
    getNodeSubLabel = (node: any) => node.vietat,
    hasChildren = (node: any) => node.coCapDuoi ?? false,
    normalizeNode = (node: unknown) => node,
}) => {
    const [nodesByParent, setNodesByParent] = useState<NodesByParent>({ [ROOT_KEY]: [] });
    const [nodeMap, setNodeMap] = useState<Record<string, NormalizedNode>>({});
    const [expanded, setExpanded] = useState<string[]>([]);
    const [loadingByParent, setLoadingByParent] = useState<BoolRecord>({});
    const [loadedByParent, setLoadedByParent] = useState<BoolRecord>({});
    const [selected, setSelected] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<NormalizedNode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        if (open) {
            setSelected(selectedId || null);
            setSelectedNode(null);
            setSearchText('');
            fetchNodes(null);
        }
    }, [open]);

    useEffect(() => {
        if (selectedId && nodeMap[selectedId]) {
            setSelectedNode(nodeMap[selectedId]);
        }
    }, [selectedId, nodeMap]);

    const fetchNodes = async (parentId: string | null) => {
        const parentKey = parentId ?? ROOT_KEY;
        if (loadingByParent[parentKey] || loadedByParent[parentKey]) return;

        setLoadingByParent(prev => ({ ...prev, [parentKey]: true }));
        try {
            let result: unknown[];
            if (parentId === null) {
                result = await fetchRootData();
            } else {
                result = await fetchChildrenData(parentId);
            }

            const normalized: NormalizedNode[] = (result || []).map(item => {
                const node = normalizeNode(item);
                return {
                    ...(node as object),
                    _id: getNodeId(node),
                    _label: getNodeLabel(node),
                    _subLabel: getNodeSubLabel(node),
                    _hasChildren: hasChildren(node),
                } as NormalizedNode;
            });

            setNodesByParent(prev => ({ ...prev, [parentKey]: normalized }));
            setNodeMap(prev => {
                const next = { ...prev };
                normalized.forEach(n => { next[n._id] = n; });
                return next;
            });
            setLoadedByParent(prev => ({ ...prev, [parentKey]: true }));
            setError(null);
        } catch (err) {
            console.error('[TreeViewPopup] Error loading data:', err);
            setError('Không thể tải dữ liệu');
        } finally {
            setLoadingByParent(prev => ({ ...prev, [parentKey]: false }));
        }
    };

    const handleExpandedChange = (_event: React.SyntheticEvent | null, itemIds: string[]) => {
        setExpanded(itemIds);
    };

    const handleItemExpansionToggle = (_event: React.SyntheticEvent<Element, Event> | null, itemId: string, isExpanded: boolean) => {
        if (isExpanded && !loadedByParent[itemId] && !loadingByParent[itemId]) {
            fetchNodes(itemId);
        }
    };

    const handleSelect = (_event: React.SyntheticEvent<Element, Event> | null, itemId: string | null) => {
        if (itemId === null) return;
        const node = nodeMap[itemId];
        if (node) {
            setSelected(itemId);
            setSelectedNode(node);
        }
    };

    const handleConfirm = () => {
        if (selectedNode) onSelect(selectedNode);
        onClose();
    };

    const handleClear = () => {
        onSelect(null);
        onClose();
    };

    const filterNodes = (items: NormalizedNode[]): NormalizedNode[] => {
        if (!searchText) return items;
        const searchLower = searchText.toLowerCase();
        return items.filter(node => {
            const matchLabel = (node._label || '').toLowerCase().includes(searchLower);
            const matchSubLabel = (node._subLabel || '').toLowerCase().includes(searchLower);
            return matchLabel || matchSubLabel;
        });
    };

    const renderTree = (items: NormalizedNode[]): React.ReactNode =>
        filterNodes(items).map(node => {
            const children = nodesByParent[node._id] || [];
            const loading = loadingByParent[node._id];
            const canHaveChildren = node._hasChildren;
            const isSelectedNode = selected === node._id;

            return (
                <TreeItem
                    key={node._id}
                    itemId={node._id}
                    label={
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                            py: 0.5,
                            backgroundColor: isSelectedNode ? '#e3f2fd' : 'transparent',
                            borderRadius: 1,
                            px: 1,
                            my: 0.25
                        }}>
                            <Typography variant="body2" sx={{ fontWeight: isSelectedNode ? 600 : 400, fontSize: '0.95rem' }}>
                                {node._label}
                            </Typography>
                            {node._subLabel && (
                                <Typography variant="caption" sx={{ color: '#666' }}>
                                    ({node._subLabel})
                                </Typography>
                            )}
                        </Box>
                    }
                    sx={{ '& .MuiTreeItem-content': { py: 0.3 } }}
                >
                    {loading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', pl: 2, py: 0.5 }}>
                            <CircularProgress size={16} />
                            <Typography variant="caption" sx={{ ml: 1 }}>Đang tải…</Typography>
                        </Box>
                    )}
                    {!loading && children.length > 0 && renderTree(children)}
                    {!loading && children.length === 0 && canHaveChildren && (
                        <Box sx={{ pl: 2, py: 0.5 }}>
                            <Typography variant="caption" sx={{ color: '#999', fontStyle: 'italic' }}>
                                Click để mở rộng
                            </Typography>
                        </Box>
                    )}
                </TreeItem>
            );
        });

    const rootNodes = useMemo(() => nodesByParent[ROOT_KEY] || [], [nodesByParent]);
    const loadingRoot = loadingByParent[ROOT_KEY];

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { height: '70vh' } }}>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box component="span" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>{title}</Box>
                {selectedNode && (
                    <Typography variant="body2" component="span" sx={{ color: '#1976d2', fontWeight: 500 }}>
                        Đã chọn: {selectedNode._label}
                    </Typography>
                )}
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Tìm kiếm…"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search />
                                </InputAdornment>
                            ),
                            endAdornment: searchText && (
                                <InputAdornment position="end">
                                    <Close
                                        sx={{ cursor: 'pointer', fontSize: 20 }}
                                        onClick={() => setSearchText('')}
                                    />
                                </InputAdornment>
                            ),
                        }}
                    />
                </Box>

                <Box sx={{ p: 2, overflow: 'auto', flex: 1 }}>
                    {loadingRoot ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                            <CircularProgress />
                        </Box>
                    ) : error ? (
                        <Alert severity="error">{error}</Alert>
                    ) : rootNodes.length === 0 ? (
                        <Alert severity="info">Không có dữ liệu</Alert>
                    ) : (
                        <SimpleTreeView
                            expandedItems={expanded}
                            selectedItems={selected ?? undefined}
                            onExpandedItemsChange={handleExpandedChange}
                            onItemExpansionToggle={handleItemExpansionToggle}
                            onSelectedItemsChange={handleSelect}
                            slots={{ expandIcon: ChevronRight, collapseIcon: ExpandMore }}
                        >
                            {renderTree(rootNodes)}
                        </SimpleTreeView>
                    )}
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button variant="outlined" color="inherit" onClick={onClose}>
                    Hủy
                </Button>
                <Button variant="outlined" color="warning" onClick={handleClear}>
                    Bỏ chọn
                </Button>
                <Button variant="contained" color="primary" onClick={handleConfirm} disabled={!selectedNode}>
                    Xác nhận
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TreeViewPopup;
