// import React, { useEffect, useMemo, useState, useCallback } from 'react';
// import { Box, Typography, Paper, CircularProgress, Alert } from '@mui/material';
// import { SimpleTreeView, TreeItem } from '@mui/x-tree-view';
// import { ExpandMore, ChevronRight } from '@mui/icons-material';
// import officeApi from '../../../apis/officeApi';

// const ROOT_KEY = 'root';

// const OfficeDictionary = React.forwardRef((props, ref) => {
//     const { onSelect, onSelectOffice, selectedOffice, offices: initialOffices = [] } = props;

//     // ✅ Tất cả hooks phải ở đầu component, không điều kiện
//     const [nodesByParent, setNodesByParent] = useState({ [ROOT_KEY]: [] });
//     const [nodeMap, setNodeMap] = useState({});
//     const [expanded, setExpanded] = useState([]);
//     const [loadingByParent, setLoadingByParent] = useState({});
//     const [loadedByParent, setLoadedByParent] = useState({});
//     const [error, setError] = useState(null);
//     const [refreshTrigger, setRefreshTrigger] = useState(0);

//     // ✅ useCallback để tránh re-create function
//     const getRootNodes = useCallback((offices) => {
//         if (!offices || offices.length === 0) return [];
//         return offices.filter(office => {
//             const hasParent = office.idcaptren || office.idCapTren || office.id_cap_tren || office.IDCapTren;
//             return !hasParent;
//         });
//     }, []);

//     // ✅ Tối ưu: Chỉ load root nodes ban đầu
//     useEffect(() => {
//         if (initialOffices && initialOffices.length > 0) {
//             console.log('[OfficeDictionary] Initial offices:', initialOffices.length, 'items');

//             const rootNodes = getRootNodes(initialOffices);
//             console.log('[OfficeDictionary] Root nodes:', rootNodes.length);

//             // Kiểm tra duplicate
//             const ids = rootNodes.map(o => o.id?.toString());
//             const uniqueIds = [...new Set(ids)];
//             if (ids.length !== uniqueIds.length) {
//                 console.error('[OfficeDictionary] DUPLICATE IDs!', ids.filter((id, idx) => ids.indexOf(id) !== idx));
//             }

//             setNodesByParent({ [ROOT_KEY]: rootNodes });

//             const map = {};
//             rootNodes.forEach((n) => {
//                 map[n.id] = n;
//             });
//             setNodeMap(map);
//             setLoadedByParent({ [ROOT_KEY]: true });
//             setError(null);
//         }
//     }, [initialOffices, refreshTrigger, getRootNodes]);

//     // ✅ useCallback cho fetchNodes
//     const fetchNodes = useCallback(async (parentId) => {
//         const parentKey = parentId ?? ROOT_KEY;
//         console.log(`[fetchNodes] parentId="${parentId}"`);

//         setLoadingByParent((prev) => ({ ...prev, [parentKey]: true }));

//         try {
//             // ✅ QUAN TRỌNG: Chỉ fetch children, không fetch toàn bộ cây
//             const result = await officeApi.getListOffices(
//                 parentId ? { parentID: parentId, loadAll: false } : null
//             );
//             console.log(`[fetchNodes] Fetched ${result?.length || 0} nodes for parent "${parentId}"`);

//             const children = result || [];

//             // Kiểm tra duplicate
//             const childIds = children.map(c => c.id?.toString());
//             const uniqueChildIds = [...new Set(childIds)];
//             if (childIds.length !== uniqueChildIds.length) {
//                 console.error(`[fetchNodes] DUPLICATE children of "${parentId}"!`, childIds.filter((id, idx) => childIds.indexOf(id) !== idx));
//             }

//             setNodesByParent((prev) => ({
//                 ...prev,
//                 [parentKey]: children
//             }));

//             setNodeMap((prev) => {
//                 const next = { ...prev };
//                 children.forEach((n) => {
//                     next[n.id] = n;
//                 });
//                 return next;
//             });

//             setLoadedByParent((prev) => ({ ...prev, [parentKey]: true }));
//             setError(null);
//         } catch (err) {
//             console.error('[fetchNodes] Error:', err);
//             setError('Không thể tải danh sách đơn vị');
//         } finally {
//             setLoadingByParent((prev) => ({ ...prev, [parentKey]: false }));
//         }
//     }, []);

//     const handleExpandedChange = useCallback((event, itemIds) => {
//         console.log('[Expanded changed]:', itemIds.length, 'items');
//         setExpanded(itemIds);
//     }, []);

//     const handleItemExpansionToggle = useCallback(async (event, itemId, isExpanded) => {
//         const parentKey = itemId;
//         const alreadyLoaded = loadedByParent[parentKey];

//         if (isExpanded && !alreadyLoaded && !loadingByParent[parentKey]) {
//             await fetchNodes(itemId);
//         }
//     }, [loadedByParent, loadingByParent, fetchNodes]);

//     const handleSelect = useCallback((_event, itemId) => {
//         const node = nodeMap[itemId];
//         console.log('[Selected]:', node?.ten || node?.Ten);

//         if (node) {
//             if (typeof onSelect === 'function') {
//                 onSelect(node);
//             } else if (typeof onSelectOffice === 'function') {
//                 onSelectOffice(node);
//             }
//         }
//     }, [nodeMap, onSelect, onSelectOffice]);

//     const refreshNode = useCallback(async (nodeId) => {
//         console.log(`[refreshNode] nodeId="${nodeId}"`);

//         try {
//             const nodeData = await officeApi.getOffice(nodeId);

//             setNodeMap((prev) => ({
//                 ...prev,
//                 [nodeId]: nodeData
//             }));

//             if (selectedOffice?.id === nodeId && onSelectOffice) {
//                 onSelectOffice(nodeData);
//             }

//             const parentId = nodeData.idcaptren || nodeData.idCapTren || null;
//             await refreshChildrenForParent(parentId);

//         } catch (err) {
//             console.error(`[refreshNode] Error:`, err);
//         }
//     }, [selectedOffice, onSelectOffice]);

//     const refreshChildrenForParent = useCallback(async (parentId) => {
//         const parentKey = parentId ?? ROOT_KEY;
//         console.log(`[refreshChildrenForParent] parentId="${parentId}"`);

//         setLoadedByParent((prev) => {
//             const next = { ...prev };
//             delete next[parentKey];
//             return next;
//         });

//         setNodesByParent((prev) => {
//             const next = { ...prev };
//             delete next[parentKey];
//             return next;
//         });

//         if (parentId) {
//             const parentIdStr = parentId.toString();
//             setExpanded((prev) => {
//                 if (!prev.includes(parentIdStr)) {
//                     return [...prev, parentIdStr];
//                 }
//                 return prev;
//             });
//         }

//         await fetchNodes(parentId);
//     }, [fetchNodes]);

//     const refreshTree = useCallback(() => {
//         console.log('[refreshTree] called');
//         setRefreshTrigger((prev) => prev + 1);
//     }, []);

//     React.useImperativeHandle(ref, () => ({
//         refreshChildrenForParent,
//         refreshNode,
//         refreshTree,
//     }), [refreshChildrenForParent, refreshNode, refreshTree]);

//     // ✅ Tối ưu: Memoize TreeItem render
//     const TreeItemMemo = React.memo(({ node, children, hasChildren, loading }) => {
//         const nodeId = node.id?.toString();
//         const ten = node.ten || node.Ten || node.tendaydu || node.tenDayDu || node.TenDayDu || nodeId;
//         const coCapDuoi = node.cocapduoi ?? node.coCapDuoi ?? node.CoCapDuoi ?? false;

//         return (
//             <TreeItem
//                 itemId={nodeId}
//                 label={
//                     <Box sx={{ 
//                         display: 'flex', 
//                         justifyContent: 'space-between', 
//                         alignItems: 'center', 
//                         pr: 1, 
//                         width: '100%' 
//                     }}>
//                         <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
//                             <Typography variant="body1" sx={{ flex: 1, fontSize: '1rem', fontWeight: 500 }}>
//                                 {ten}
//                             </Typography>
//                             {hasChildren && (
//                                 <Typography variant="caption" sx={{
//                                     color: '#1976d2',
//                                     fontSize: '14px',
//                                     backgroundColor: '#e3f2fd',
//                                     px: 0.8,
//                                     py: 0.2,
//                                     borderRadius: 1,
//                                     fontWeight: 500
//                                 }}>
//                                     {children.length}
//                                 </Typography>
//                             )}
//                         </Box>
//                     </Box>
//                 }
//             >
//                 {loading && (
//                     <Box sx={{ display: 'flex', alignItems: 'center', pl: 2, py: 0.5 }}>
//                         <CircularProgress size={16} />
//                         <Typography variant="body2" sx={{ ml: 1, fontSize: '0.95rem' }}>
//                             Đang tải...
//                         </Typography>
//                     </Box>
//                 )}
//                 {!loading && hasChildren && renderTree(children)}
//                 {!loading && !hasChildren && coCapDuoi && (
//                     <Box sx={{ pl: 5, py: 0.5 }}>
//                         <Typography variant="caption" sx={{ 
//                             color: '#757575', 
//                             fontStyle: 'italic', 
//                             fontSize: '0.875rem' 
//                         }}>
//                             Chưa có đơn vị cấp dưới
//                         </Typography>
//                     </Box>
//                 )}
//             </TreeItem>
//         );
//     }, (prevProps, nextProps) => {
//         // Custom comparison để tránh re-render không cần thiết
//         return (
//             prevProps.node.id === nextProps.node.id &&
//             prevProps.hasChildren === nextProps.hasChildren &&
//             prevProps.loading === nextProps.loading &&
//             prevProps.children?.length === nextProps.children?.length
//         );
//     });

//     const renderTree = useCallback((items) => {
//         if (!items || items.length === 0) return null;

//         return items.map((node) => {
//             const nodeId = node.id?.toString();
//             const children = nodesByParent[nodeId] || [];
//             const loading = loadingByParent[nodeId];
//             const hasChildren = children.length > 0;

//             return (
//                 <TreeItemMemo
//                     key={nodeId}
//                     node={node}
//                     children={children}
//                     hasChildren={hasChildren}
//                     loading={loading}
//                 />
//             );
//         });
//     }, [nodesByParent, loadingByParent]);

//     const rootNodes = useMemo(() => nodesByParent[ROOT_KEY] || [], [nodesByParent]);
//     const loadingRoot = loadingByParent[ROOT_KEY];

//     return (
//         <Box sx={{
//             width: '100%',
//             minWidth: 0,
//             boxShadow: 1,
//             display: 'flex',
//             flexDirection: 'column',
//             backgroundColor: '#fafafa',
//             height: '100%',
//             overflow: 'hidden'
//         }}>
//             <Typography variant="h5" sx={{ fontWeight: 600, p: 2, pb: 1 }}>
//                 Danh sách Đơn vị
//             </Typography>

//             <Paper sx={{
//                 p: 2,
//                 backgroundColor: '#fafafa',
//                 overflow: 'auto',
//                 flex: 1,
//             }}>
//                 {loadingRoot ? (
//                     <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
//                         <CircularProgress />
//                     </Box>
//                 ) : error ? (
//                     <Alert severity="error">{error}</Alert>
//                 ) : rootNodes.length === 0 ? (
//                     <Alert severity="info">Không có dữ liệu đơn vị</Alert>
//                 ) : (
//                     <SimpleTreeView
//                         expandedItems={expanded}
//                         selectedItems={selectedOffice?.id ? selectedOffice.id.toString() : null}
//                         onExpandedItemsChange={handleExpandedChange}
//                         onItemExpansionToggle={handleItemExpansionToggle}
//                         onSelectedItemsChange={handleSelect}
//                         slots={{
//                             expandIcon: ChevronRight,
//                             collapseIcon: ExpandMore,
//                         }}
//                         sx={{ flex: 1 }}
//                     >
//                         {renderTree(rootNodes)}
//                     </SimpleTreeView>
//                 )}
//             </Paper>
//         </Box>
//     );
// });

// OfficeDictionary.displayName = 'OfficeDictionary';

// export default OfficeDictionary;