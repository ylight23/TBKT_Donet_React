import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Autocomplete from '@mui/material/Autocomplete';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { GridColDef } from '@mui/x-data-grid';

import LazyDataGrid from '../../components/LazyDataGrid';
import officeApi, { type OfficeListOption } from '../../apis/officeApi';
import nhomDongBoApi, {
    type NhomDongBoGridItem,
    type NhomDongBoThanhVienView,
} from '../../apis/nhomDongBoApi';
import NhomDongBoManageDialog from './NhomDongBoManageDialog';

const formatTimestamp = (value?: { seconds?: bigint | number; nanos?: number } | null): string => {
    if (!value || value.seconds === undefined || value.seconds === null) return '-';

    const seconds = Number(value.seconds);
    if (!Number.isFinite(seconds)) return '-';

    const ms = seconds * 1000 + Math.floor((value.nanos ?? 0) / 1_000_000);
    return new Date(ms).toLocaleString('vi-VN');
};

const NhomDongBoPage: React.FC = () => {
    const [rows, setRows] = useState<NhomDongBoGridItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [officeOptions, setOfficeOptions] = useState<OfficeListOption[]>([]);
    const [officeLoading, setOfficeLoading] = useState(false);
    const [selectedOfficeId, setSelectedOfficeId] = useState('');
    const [searchText, setSearchText] = useState('');

    const [selectedId, setSelectedId] = useState('');
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState('');
    const [detailItem, setDetailItem] = useState<{ id: string; tenNhom: string; idDonVi: string; version: number; ngaySua?: any; nguoiSua?: string } | null>(null);
    const [detailMembers, setDetailMembers] = useState<NhomDongBoThanhVienView[]>([]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const loadOfficeOptions = useCallback(async () => {
        setOfficeLoading(true);
        try {
            const options = await officeApi.getListOfficeOptions();
            setOfficeOptions(options);
        } catch {
            setOfficeOptions([]);
        } finally {
            setOfficeLoading(false);
        }
    }, []);

    const loadRows = useCallback(async () => {
        setLoading(true);
        setErrorMessage('');
        try {
            const items = await nhomDongBoApi.getListNhomDongBo({
                idDonVi: selectedOfficeId || undefined,
                searchText: searchText.trim() || undefined,
            });
            setRows(items);

            if (items.length > 0 && !selectedId) {
                setSelectedId(items[0].id);
            }
            if (selectedId && !items.some((item) => item.id === selectedId)) {
                setSelectedId(items[0]?.id ?? '');
            }
        } catch (error) {
            setRows([]);
            setErrorMessage(String((error as Error)?.message || 'Khong the tai danh sach nhom dong bo'));
        } finally {
            setLoading(false);
        }
    }, [searchText, selectedOfficeId, selectedId]);

    const loadDetail = useCallback(async (id: string) => {
        if (!id) {
            setDetailItem(null);
            setDetailMembers([]);
            setDetailError('');
            return;
        }

        setDetailLoading(true);
        setDetailError('');
        try {
            const res = await nhomDongBoApi.getNhomDongBo(id);
            setDetailItem({
                id: String(res.item.id ?? '').trim(),
                tenNhom: String(res.item.tenNhom ?? '').trim(),
                idDonVi: String(res.item.idDonVi ?? '').trim(),
                version: Number(res.item.version ?? 0),
                ngaySua: res.item.ngaySua,
                nguoiSua: res.item.nguoiSua,
            });
            setDetailMembers(res.thanhVien ?? []);
        } catch (error) {
            setDetailItem(null);
            setDetailMembers([]);
            setDetailError(String((error as Error)?.message || 'Khong the tai chi tiet nhom dong bo'));
        } finally {
            setDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadOfficeOptions();
    }, [loadOfficeOptions]);

    useEffect(() => {
        void loadRows();
    }, [loadRows]);

    useEffect(() => {
        void loadDetail(selectedId);
    }, [selectedId, loadDetail]);

    const officeValue = useMemo(
        () => officeOptions.find((item) => item.value === selectedOfficeId) ?? null,
        [officeOptions, selectedOfficeId],
    );

    const columns = useMemo<GridColDef<NhomDongBoGridItem>[]>(() => [
        { field: 'id', headerName: 'ID nhom', minWidth: 220, flex: 1 },
        { field: 'tenNhom', headerName: 'Ten nhom', minWidth: 220, flex: 1.1 },
        { field: 'idDonVi', headerName: 'ID don vi', minWidth: 160 },
        { field: 'tenDonVi', headerName: 'Ten don vi', minWidth: 220, flex: 1 },
        { field: 'soTrangBi', headerName: 'So trang bi', width: 120, align: 'right', headerAlign: 'right' },
        { field: 'nguoiSua', headerName: 'Nguoi sua', minWidth: 160 },
        {
            field: 'ngaySua',
            headerName: 'Ngay sua',
            minWidth: 180,
            valueFormatter: (value) => formatTimestamp(value as any),
        },
    ], []);

    const handleOpenCreate = useCallback(() => {
        setEditingId(null);
        setDialogOpen(true);
    }, []);

    const handleOpenEdit = useCallback((row: NhomDongBoGridItem) => {
        setEditingId(String(row.id ?? '').trim());
        setDialogOpen(true);
    }, []);

    const handleDelete = useCallback(async (row: NhomDongBoGridItem) => {
        const targetId = String(row.id ?? '').trim();
        if (!targetId) return;

        const confirmed = window.confirm(`Xac nhan xoa nhom dong bo '${row.tenNhom || targetId}'?`);
        if (!confirmed) return;

        try {
            await nhomDongBoApi.deleteNhomDongBo(targetId);
            if (selectedId === targetId) {
                setSelectedId('');
            }
            await loadRows();
        } catch (error) {
            setErrorMessage(String((error as Error)?.message || 'Xoa nhom dong bo that bai'));
        }
    }, [loadRows, selectedId]);

    const handleDialogSaved = useCallback(async () => {
        await loadRows();
        if (editingId) {
            setSelectedId(editingId);
        }
    }, [editingId, loadRows]);

    return (
        <Stack sx={{ height: '100%', p: 2, gap: 2 }}>
            <Paper variant="outlined" sx={{ p: 1.5 }}>
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25} alignItems={{ md: 'center' }}>
                    <Stack spacing={0.25} sx={{ minWidth: { md: 280 } }}>
                        <Typography variant="h6" fontWeight={700}>Quan ly nhom dong bo</Typography>
                        <Typography variant="body2" color="text.secondary">
                            Quan tri danh sach nhom dong bo, xem chi tiet thanh vien, cap nhat hoac xoa nhom tap trung.
                        </Typography>
                    </Stack>

                    <Autocomplete
                        size="small"
                        options={officeOptions}
                        loading={officeLoading}
                        value={officeValue}
                        onChange={(_event, option) => setSelectedOfficeId(option?.value ?? '')}
                        getOptionLabel={(option) => option.label}
                        isOptionEqualToValue={(option, value) => option.value === value.value}
                        sx={{ minWidth: { md: 260 } }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Loc theo don vi"
                                placeholder="Tat ca don vi"
                                slotProps={{
                                    input: {
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {officeLoading ? <CircularProgress color="inherit" size={16} /> : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    },
                                }}
                            />
                        )}
                    />

                    <TextField
                        size="small"
                        label="Tim nhom"
                        placeholder="Nhap ten nhom / ID"
                        value={searchText}
                        onChange={(event) => setSearchText(event.target.value)}
                        sx={{ minWidth: { md: 260 } }}
                    />

                    <Stack direction="row" spacing={1} sx={{ ml: { md: 'auto' } }}>
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => void loadRows()}>
                            Tai lai
                        </Button>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreate}>
                            Tao nhom
                        </Button>
                    </Stack>
                </Stack>
            </Paper>

            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} sx={{ minHeight: 0, flex: 1 }}>
                <Paper variant="outlined" sx={{ flex: { xs: 1, lg: 1.25 }, minHeight: 420, p: 1 }}>
                    <LazyDataGrid
                        rows={rows}
                        columns={columns}
                        loading={loading}
                        getRowId={(row) => row.id}
                        onRowClick={(params) => setSelectedId(String(params.row.id ?? ''))}
                        disableRowSelectionOnClick
                        pageSizeOptions={[10, 20, 50]}
                        initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
                        rowActions={{
                            edit: (row) => handleOpenEdit(row as NhomDongBoGridItem),
                            delete: (row) => void handleDelete(row as NhomDongBoGridItem),
                            hidden: {
                                view: true,
                                print: true,
                                export: true,
                            },
                        }}
                    />
                </Paper>

                <Paper variant="outlined" sx={{ flex: { xs: 1, lg: 1 }, minHeight: 420, p: 1.5, overflow: 'auto' }}>
                    <Stack spacing={1.25}>
                        <Typography variant="subtitle1" fontWeight={700}>Chi tiet nhom dong bo</Typography>

                        {!selectedId && (
                            <Alert severity="info">Chon mot nhom trong danh sach de xem chi tiet.</Alert>
                        )}

                        {detailLoading && (
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <CircularProgress size={18} />
                                <Typography variant="body2" color="text.secondary">Dang tai chi tiet nhom...</Typography>
                            </Stack>
                        )}

                        {detailError && <Alert severity="error">{detailError}</Alert>}

                        {!detailLoading && detailItem && (
                            <>
                                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                                    <Chip size="small" color="primary" label={`ID: ${detailItem.id || '-'}`} />
                                    <Chip size="small" label={`Don vi: ${detailItem.idDonVi || '-'}`} />
                                    <Chip size="small" label={`Version: ${detailItem.version}`} />
                                </Stack>

                                <Typography variant="h6" fontWeight={700}>{detailItem.tenNhom || '-'}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Nguoi sua: {detailItem.nguoiSua || '-'} • Ngay sua: {formatTimestamp(detailItem.ngaySua)}
                                </Typography>

                                <Divider />

                                <Typography variant="subtitle2" fontWeight={700}>
                                    Thanh vien ({detailMembers.length})
                                </Typography>

                                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, overflow: 'hidden' }}>
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ width: 56 }}>Nhom</TableCell>
                                                <TableCell>ID trang bi</TableCell>
                                                <TableCell>Ma danh muc</TableCell>
                                                <TableCell>Ten danh muc</TableCell>
                                                <TableCell>So hieu</TableCell>
                                                <TableCell sx={{ width: 120 }}>Quyen</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {detailMembers.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={6}>
                                                        <Typography variant="body2" color="text.secondary" py={1}>
                                                            Nhom nay chua co thanh vien.
                                                        </Typography>
                                                    </TableCell>
                                                </TableRow>
                                            )}

                                            {detailMembers.map((member) => (
                                                <TableRow key={`${member.nhom}:${member.id}`} hover>
                                                    <TableCell>{member.nhom}</TableCell>
                                                    <TableCell>{member.id || '-'}</TableCell>
                                                    <TableCell>{member.maDanhMuc || '-'}</TableCell>
                                                    <TableCell>{member.tenDanhMuc || '-'}</TableCell>
                                                    <TableCell>{member.soHieu || '-'}</TableCell>
                                                    <TableCell>
                                                        {member.restricted
                                                            ? <Chip size="small" color="warning" label="Restricted" />
                                                            : <Chip size="small" color="success" label="OK" />}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            </>
                        )}
                    </Stack>
                </Paper>
            </Stack>

            <NhomDongBoManageDialog
                open={dialogOpen}
                onClose={() => {
                    setDialogOpen(false);
                    setEditingId(null);
                }}
                onSaved={() => void handleDialogSaved()}
                editingId={editingId}
            />
        </Stack>
    );
};

export default NhomDongBoPage;
