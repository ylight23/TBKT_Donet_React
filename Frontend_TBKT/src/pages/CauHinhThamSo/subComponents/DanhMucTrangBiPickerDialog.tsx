import React, { useEffect, useMemo, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { DanhMucTrangBiTree } from '../../../apis/danhMucTrangBiApi';
import DanhMucTrangBiDictionary from '../../DanhMucTrangBi/DanhMucTrangBiDictionary';

interface DanhMucTrangBiPickerDialogProps {
    open: boolean;
    excludeIds?: string[];
    onSelect: (nodes: DanhMucTrangBiTree[]) => void;
    onClose: () => void;
}

const buildNodeLabel = (node: DanhMucTrangBiTree): string => {
    const parts = [node.ten, node.tenDayDu].filter((value, index, arr) => value && arr.indexOf(value) === index);
    return parts.join(' - ') || node.id || '';
};

const DanhMucTrangBiPickerDialog: React.FC<DanhMucTrangBiPickerDialogProps> = ({
    open,
    excludeIds = [],
    onSelect,
    onClose,
}) => {
    const [selectedNodes, setSelectedNodes] = useState<Record<string, DanhMucTrangBiTree>>({});
    const [lastSelectedId, setLastSelectedId] = useState('');
    const [selectedSearch, setSelectedSearch] = useState('');

    useEffect(() => {
        if (!open) {
            setSelectedNodes({});
            setLastSelectedId('');
            setSelectedSearch('');
        }
    }, [open]);

    const selectedList = useMemo(
        () => Object.values(selectedNodes).sort((a, b) => String(a.id ?? '').localeCompare(String(b.id ?? ''))),
        [selectedNodes],
    );

    const filteredSelectedList = useMemo(() => {
        const keyword = selectedSearch.trim().toLowerCase();
        if (!keyword) return selectedList;

        return selectedList.filter((node) => {
            const id = String(node.id ?? '').toLowerCase();
            const label = buildNodeLabel(node).toLowerCase();
            return id.includes(keyword) || label.includes(keyword);
        });
    }, [selectedList, selectedSearch]);

    const handlePickNode = (node: DanhMucTrangBiTree) => {
        const id = node.id ?? '';
        if (!id || excludeIds.includes(id)) return;

        setSelectedNodes((prev) => {
            if (prev[id]) return prev;
            return { ...prev, [id]: node };
        });
        setLastSelectedId(id);
    };

    const handleRemoveNode = (id: string) => {
        setSelectedNodes((prev) => {
            const next = { ...prev };
            delete next[id];
            return next;
        });
        setLastSelectedId((prev) => (prev === id ? '' : prev));
    };

    const handleConfirm = () => {
        if (selectedList.length === 0) return;
        onSelect(selectedList);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ fontWeight: 700 }}>Chon danh muc trang bi</DialogTitle>
            <DialogContent dividers sx={{ p: 0 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} sx={{ minHeight: 520 }}>
                    <Box sx={{ flex: 1, minWidth: 0, borderRight: { md: '1px solid' }, borderColor: 'divider' }}>
                        <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="body2" color="text.secondary">
                                Bam vao node trong cay de dua vao danh sach chon. Dialog se khong tu dong dong.
                            </Typography>
                        </Box>
                        <Box sx={{ height: { xs: 320, md: 468 } }}>
                            <DanhMucTrangBiDictionary selectedId={lastSelectedId} onSelect={handlePickNode} />
                        </Box>
                    </Box>

                    <Box sx={{ width: { xs: '100%', md: 320 }, p: 2, bgcolor: 'background.default' }}>
                        <Stack spacing={1.5}>
                            <Typography variant="subtitle2" fontWeight={700}>
                                Da chon ({selectedList.length})
                            </Typography>

                            <TextField
                                size="small"
                                fullWidth
                                value={selectedSearch}
                                onChange={(e) => setSelectedSearch(e.target.value)}
                                placeholder="Tim trong danh sach da chon..."
                            />

                            {excludeIds.length > 0 && (
                                <Alert severity="info" variant="outlined">
                                    Cac danh muc da gan truoc do se khong duoc them lai.
                                </Alert>
                            )}

                            {selectedList.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    Chua co danh muc nao trong danh sach tam chon.
                                </Typography>
                            ) : filteredSelectedList.length === 0 ? (
                                <Typography variant="body2" color="text.secondary">
                                    Khong tim thay danh muc phu hop voi tu khoa loc.
                                </Typography>
                            ) : (
                                <Stack direction="row" flexWrap="wrap" gap={0.75}>
                                    {filteredSelectedList.map((node) => {
                                        const id = node.id ?? '';
                                        return (
                                            <Chip
                                                key={id}
                                                label={`${buildNodeLabel(node)} (${id})`}
                                                onDelete={() => handleRemoveNode(id)}
                                                sx={{ maxWidth: '100%' }}
                                            />
                                        );
                                    })}
                                </Stack>
                            )}

                            <Button
                                variant="text"
                                color="inherit"
                                disabled={selectedList.length === 0}
                                onClick={() => {
                                    setSelectedNodes({});
                                    setLastSelectedId('');
                                }}
                                sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                            >
                                Xoa danh sach tam chon
                            </Button>
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Dong</Button>
                <Button variant="contained" onClick={handleConfirm} disabled={selectedList.length === 0}>
                    Them da chon
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DanhMucTrangBiPickerDialog;
