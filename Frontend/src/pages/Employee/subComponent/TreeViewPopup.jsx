import React, { useState, useEffect, useMemo } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Box,
    Typography,
    TextField,
    CircularProgress,
    Alert,
    InputAdornment
} from '@mui/material';
import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
import { ExpandMore, ChevronRight, Search, Close } from '@mui/icons-material';

const ROOT_KEY = 'root';

const TreeViewPopup = ({
    open,
    onClose,
    onSelect,
    selectedId,
    title = "Chọn mục",
    // API functions
    fetchRootData,        // () => Promise<Array> - fetch root nodes
    fetchChildrenData,    // (parentId) => Promise<Array> - fetch children
    // Field mapping
    getNodeId = (node) => node.id,
    getNodeLabel = (node) => node.ten || node.tenDayDu || node.id,
    getNodeSubLabel = (node) => node.vietat,
    hasChildren = (node) => node.coCapDuoi ?? node.coCapDuoi ?? false,
    // Normalize function
    normalizeNode = (node) => node,
}) => {
    const [nodesByParent, setNodesByParent] = useState({ [ROOT_KEY]: [] });
    const [nodeMap, setNodeMap] = useState({});
    const [expanded, setExpanded] = useState([]);
    const [loadingByParent, setLoadingByParent] = useState({});
    const [loadedByParent, setLoadedByParent] = useState({});
    const [selected, setSelected] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [error, setError] = useState(null);
    const [searchText, setSearchText] = useState('');

    // Reset state khi dialog mở
    useEffect(() => {
        if (open) {
            setSelected(selectedId || null);
            setSelectedNode(null);
            setSearchText('');
            fetchNodes(null);
        }
    }, [open]);

    // Update selected node khi selectedId thay đổi
    useEffect(() => {
        if (selectedId && nodeMap[selectedId]) {
            setSelectedNode(nodeMap[selectedId]);
        }
    }, [selectedId, nodeMap]);

    const fetchNodes = async (parentId) => {
        const parentKey = parentId ?? ROOT_KEY;
        if (loadingByParent[parentKey] || loadedByParent[parentKey]) return;

        setLoadingByParent((prev) => ({ ...prev, [parentKey]: true }));
        try {
            let result;
            if (parentId === null) {
                result = await fetchRootData();
            } else {
                result = await fetchChildrenData(parentId);
            }

            const normalized = (result || []).map(item => {
                const node = normalizeNode(item);
                return {
                    ...node,
                    _id: getNodeId(node),
                    _label: getNodeLabel(node),
                    _subLabel: getNodeSubLabel(node),
                    _hasChildren: hasChildren(node),
                };
            });

            setNodesByParent((prev) => ({ ...prev, [parentKey]: normalized }));
            setNodeMap((prev) => {
                const next = { ...prev };
                normalized.forEach((n) => { next[n._id] = n; });
                return next;
            });
            setLoadedByParent((prev) => ({ ...prev, [parentKey]: true }));
            setError(null);
        } catch (err) {
            console.error('[TreeViewPopup] Error loading data:', err);
            setError('Không thể tải dữ liệu');
        } finally {
            setLoadingByParent((prev) => ({ ...prev, [parentKey]: false }));
        }
    };

    const handleExpandedChange = (event, itemIds) => {
        setExpanded(itemIds);
    };

    const handleItemExpansionToggle = async (event, itemId, isExpanded) => {
        if (isExpanded && !loadedByParent[itemId] && !loadingByParent[itemId]) {
            await fetchNodes(itemId);
        }
    };

    const handleSelect = (event, itemId) => {
        const node = nodeMap[itemId];
        if (node) {
            setSelected(itemId);
            setSelectedNode(node);
        }
    };

    const handleConfirm = () => {
        if (selectedNode) {
            onSelect(selectedNode);
        }
        onClose();
    };

    const handleClear = () => {
        onSelect(null);
        onClose();
    };

    const filterNodes = (items) => {
        if (!searchText) return items;

        const searchLower = searchText.toLowerCase();
        return items.filter(node => {
            const matchLabel = (node._label || '').toLowerCase().includes(searchLower);
            const matchSubLabel = (node._subLabel || '').toLowerCase().includes(searchLower);
            return matchLabel || matchSubLabel;
        });
    };

    const renderTree = (items) =>
        filterNodes(items).map((node) => {
            const children = nodesByParent[node._id] || [];
            const loading = loadingByParent[node._id];
            const hasChildNodes = children.length > 0;
            const canHaveChildren = node._hasChildren;
            const isSelected = selected === node._id;

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
                            backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
                            borderRadius: 1,
                            px: 1,
                            my: 0.25
                        }}>
                            <Typography variant="body2" sx={{ fontWeight: isSelected ? 600 : 400, fontSize: '0.95rem' }}>
                                {node._label}
                            </Typography>
                            {node._subLabel && (
                                <Typography variant="caption" sx={{ color: '#666' }}>
                                    ({node._subLabel})
                                </Typography>
                            )}
                        </Box>
                    }
                    sx={{
                        '& .MuiTreeItem-content': {
                            py: 0.3,
                        }
                    }}
                >
                    {loading && (
                        <Box sx={{ display: 'flex', alignItems: 'center', pl: 2, py: 0.5 }}>
                            <CircularProgress size={16} />
                            <Typography variant="caption" sx={{ ml: 1 }}>Đang tải...</Typography>
                        </Box>
                    )}
                    {!loading && hasChildNodes && renderTree(children)}
                    {!loading && !hasChildNodes && canHaveChildren && (
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
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { height: '70vh' } }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Box component="span" sx={{ fontWeight: 600, fontSize: '1.25rem' }}>{title}</Box>
                {selectedNode && (
                    <Typography variant="body2" component="span" sx={{ color: '#1976d2', fontWeight: 500 }}>
                        Đã chọn: {selectedNode._label}
                    </Typography>
                )}
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0, display: 'flex', flexDirection: 'column' }}>
                {/* Search */}
                <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                    <TextField
                        size="small"
                        fullWidth
                        placeholder="Tìm kiếm..."
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
                            )
                        }}
                    />
                </Box>

                {/* Tree View */}
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
                            selectedItems={selected}
                            onExpandedItemsChange={handleExpandedChange}
                            onItemExpansionToggle={handleItemExpansionToggle}
                            onSelectedItemsChange={handleSelect}
                            slots={{
                                expandIcon: ChevronRight,
                                collapseIcon: ExpandMore,
                            }}
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
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleConfirm}
                    disabled={!selectedNode}
                >
                    Xác nhận
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TreeViewPopup;