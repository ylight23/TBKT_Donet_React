import React, { useState, useEffect, useMemo } from 'react';

// ✅ Direct imports
import {
    Button,
    Box,
    Typography,
    TextField,
    CircularProgress,
    Alert,
    InputAdornment,
    Paper,
    Stack,
    IconButton
} from '@mui/material';
import CommonDialog from '../../../components/Dialog/CommonDialog';
import ExpandMore from '@mui/icons-material/ExpandMore';
import ChevronRight from '@mui/icons-material/ChevronRight';
import Search from '@mui/icons-material/Search';
import Close from '@mui/icons-material/Close';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

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
                            borderRadius: 2.5,
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
        <CommonDialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            mode="info"
            title={title}
            subtitle={selectedNode ? `Đang chọn: ${selectedNode._label}` : "Duyệt danh sách phân cấp để lựa chọn"}
            icon={<AccountTreeIcon />}
            onConfirm={handleConfirm}
            confirmText="Xác nhận chọn"
            disabled={!selectedNode}
            contentPadding={0}
            extraActions={
                <Button
                    variant="outlined"
                    color="warning"
                    size="small"
                    onClick={handleClear}
                    sx={{ fontWeight: 700, textTransform: 'none' }}
                >
                    Bỏ chọn
                </Button>
            }
            sx={{ '& .MuiDialog-paper': { height: '80vh' } }}
        >
            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
                <TextField
                    size="small"
                    fullWidth
                    variant="outlined"
                    placeholder="Tìm kiếm nội dung..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search fontSize="small" />
                            </InputAdornment>
                        ),
                        endAdornment: searchText && (
                            <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setSearchText('')}>
                                    <Close fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                        sx: { bgcolor: 'background.paper', borderRadius: 2.5}
                    }}
                />
            </Box>

            <Box sx={{ p: 2, overflow: 'auto', flex: 1 }}>
                {loadingRoot ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: 200, gap: 2 }}>
                        <CircularProgress size={32} />
                        <Typography variant="caption" color="text.secondary">Đang bóc tách dữ liệu cây...</Typography>
                    </Box>
                ) : error ? (
                    <Alert severity="error" variant="outlined">{error}</Alert>
                ) : rootNodes.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', opacity: 0.5 }}>
                        <AccountTreeIcon sx={{ fontSize: 48, mb: 1 }} />
                        <Typography variant="body2">Không tìm thấy dữ liệu phù hợp</Typography>
                    </Box>
                ) : (
                    <SimpleTreeView
                        expandedItems={expanded}
                        selectedItems={selected ?? undefined}
                        onExpandedItemsChange={handleExpandedChange}
                        onItemExpansionToggle={handleItemExpansionToggle}
                        onSelectedItemsChange={handleSelect}
                        slots={{ expandIcon: ChevronRight, collapseIcon: ExpandMore }}
                        sx={{
                            '& .MuiTreeItem-content': {
                                borderRadius: 2.5,
                                py: 0.5,
                                '&:hover': { bgcolor: 'action.hover' },
                                '&.Mui-selected': {
                                    bgcolor: 'primary.lighter',
                                    color: 'primary.main',
                                    fontWeight: 700,
                                    '&:hover': { bgcolor: 'primary.lighter' }
                                }
                            }
                        }}
                    >
                        {renderTree(rootNodes)}
                    </SimpleTreeView>
                )}
            </Box>
        </CommonDialog>
    );
};

export default TreeViewPopup;
