import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddLinkIcon from '@mui/icons-material/AddLink';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';

import { FormDialog } from '../../components/Dialog';
import officeApi, { type OfficeListOption } from '../../apis/officeApi';
import nhomDongBoApi from '../../apis/nhomDongBoApi';
import trangBiKiThuatApi from '../../apis/trangBiKiThuatApi';

interface CandidateTrangBiItem {
    id: string;
    nhom: 1 | 2;
    maDanhMuc: string;
    tenDanhMuc: string;
    soHieu: string;
    idNhomDongBo?: string;
    trangThaiDongBo: boolean;
}

interface NhomDongBoManageDialogProps {
    open: boolean;
    onClose: () => void;
    onSaved: () => void;
    editingId?: string | null;
}

const buildCandidateKey = (item: Pick<CandidateTrangBiItem, 'id' | 'nhom'>): string =>
    `${item.nhom}:${item.id}`;

const mapTrangBiListItem = (
    nhom: 1 | 2,
    item: Awaited<ReturnType<typeof trangBiKiThuatApi.getListTrangBiNhom1>>[number]
        | Awaited<ReturnType<typeof trangBiKiThuatApi.getListTrangBiNhom2>>[number],
): CandidateTrangBiItem => ({
    id: String(item.id ?? '').trim(),
    nhom,
    maDanhMuc: String(item.maDanhMuc ?? '').trim(),
    tenDanhMuc: String(item.tenDanhMuc ?? '').trim(),
    soHieu: String(item.soHieu ?? '').trim(),
    idNhomDongBo: item.idNhomDongBo ? String(item.idNhomDongBo).trim() : undefined,
    trangThaiDongBo: Boolean(item.trangThaiDongBo),
});

const NhomDongBoManageDialog: React.FC<NhomDongBoManageDialogProps> = ({
    open,
    onClose,
    onSaved,
    editingId,
}) => {
    const isEditMode = Boolean(editingId);
    const [tenNhom, setTenNhom] = useState('');
    const [idDonVi, setIdDonVi] = useState('');
    const [officeOptions, setOfficeOptions] = useState<OfficeListOption[]>([]);
    const [officeLoading, setOfficeLoading] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState('');
    const [searchResults, setSearchResults] = useState<CandidateTrangBiItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<CandidateTrangBiItem[]>([]);
    const [recordLoading, setRecordLoading] = useState(false);
    const [recordError, setRecordError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const [expectedVersion, setExpectedVersion] = useState<number | undefined>(undefined);
    const [initialParameters, setInitialParameters] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!open) return;

        setTenNhom('');
        setIdDonVi('');
        setSearchText('');
        setSearchResults([]);
        setSelectedItems([]);
        setSearchError('');
        setRecordError('');
        setSaveError('');
        setSaving(false);
        setExpectedVersion(undefined);
        setInitialParameters({});
    }, [open]);

    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        setOfficeLoading(true);

        officeApi.getListOfficeOptions()
            .then((items) => {
                if (!cancelled) setOfficeOptions(items);
            })
            .catch((error) => {
                if (!cancelled) {
                    setSaveError(String((error as Error)?.message || 'Khong the tai danh sach don vi'));
                }
            })
            .finally(() => {
                if (!cancelled) setOfficeLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open]);

    useEffect(() => {
        if (!open || !editingId) return;
        let cancelled = false;
        setRecordLoading(true);
        setRecordError('');

        nhomDongBoApi.getNhomDongBo(editingId)
            .then((res) => {
                if (cancelled) return;
                const item = res.item;
                setTenNhom(String(item.tenNhom ?? '').trim());
                setIdDonVi(String(item.idDonVi ?? '').trim());
                setExpectedVersion(typeof item.version === 'number' ? item.version : undefined);
                setInitialParameters(item.parameters ?? {});

                const rows = (res.thanhVien ?? []).map((member) => ({
                    id: String(member.id ?? '').trim(),
                    nhom: (Number(member.nhom) === 2 ? 2 : 1) as 1 | 2,
                    maDanhMuc: String(member.maDanhMuc ?? '').trim(),
                    tenDanhMuc: String(member.tenDanhMuc ?? '').trim(),
                    soHieu: String(member.soHieu ?? '').trim(),
                    idNhomDongBo: editingId,
                    trangThaiDongBo: true,
                }))
                    .filter((member) => member.id.length > 0);

                setSelectedItems(rows);
            })
            .catch((error) => {
                if (!cancelled) {
                    setRecordError(String((error as Error)?.message || 'Khong the tai chi tiet nhom dong bo'));
                }
            })
            .finally(() => {
                if (!cancelled) setRecordLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, editingId]);

    useEffect(() => {
        if (!open) return;

        const query = searchText.trim();
        if (query.length < 2) {
            setSearchResults([]);
            setSearchError('');
            setSearchLoading(false);
            return;
        }

        let cancelled = false;
        const timer = window.setTimeout(() => {
            setSearchLoading(true);
            setSearchError('');

            Promise.all([
                trangBiKiThuatApi.getListTrangBiNhom1({ searchText: query }),
                trangBiKiThuatApi.getListTrangBiNhom2({ searchText: query }),
            ])
                .then(([nhom1, nhom2]) => {
                    if (cancelled) return;
                    const merged = [
                        ...nhom1.map((item) => mapTrangBiListItem(1, item)),
                        ...nhom2.map((item) => mapTrangBiListItem(2, item)),
                    ].filter((item) => item.id);
                    setSearchResults(merged);
                })
                .catch((error) => {
                    if (!cancelled) {
                        setSearchError(String((error as Error)?.message || 'Khong the tai danh sach trang bi'));
                        setSearchResults([]);
                    }
                })
                .finally(() => {
                    if (!cancelled) setSearchLoading(false);
                });
        }, 250);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [open, searchText]);

    const selectedKeySet = useMemo(
        () => new Set(selectedItems.map((item) => buildCandidateKey(item))),
        [selectedItems],
    );

    const officeValue = useMemo(
        () => officeOptions.find((item) => item.value === idDonVi) ?? null,
        [idDonVi, officeOptions],
    );

    const canSave = Boolean(tenNhom.trim() && idDonVi.trim() && selectedItems.length > 0) && !saving && !recordLoading;

    const isBlockedByOtherGroup = useCallback((item: CandidateTrangBiItem) => {
        if (!item.idNhomDongBo) return false;
        if (!editingId) return true;
        return item.idNhomDongBo !== editingId;
    }, [editingId]);

    const handleAddCandidate = useCallback((item: CandidateTrangBiItem) => {
        if (isBlockedByOtherGroup(item)) return;

        const key = buildCandidateKey(item);
        if (selectedKeySet.has(key)) return;

        setSelectedItems((prev) => [...prev, item]);
    }, [isBlockedByOtherGroup, selectedKeySet]);

    const handleRemoveSelected = useCallback((item: CandidateTrangBiItem) => {
        const key = buildCandidateKey(item);
        setSelectedItems((prev) => prev.filter((entry) => buildCandidateKey(entry) !== key));
    }, []);

    const handleSave = useCallback(async () => {
        if (!canSave) return;

        setSaveError('');
        setSaving(true);
        try {
            await nhomDongBoApi.saveNhomDongBo({
                id: editingId || undefined,
                tenNhom: tenNhom.trim(),
                idDonVi: idDonVi.trim(),
                dsTrangBi: selectedItems.map((item) => ({ id: item.id, nhom: item.nhom })),
                parameters: initialParameters,
                expectedVersion,
            });

            onSaved();
            onClose();
        } catch (error) {
            setSaveError(String((error as Error)?.message || 'Khong the luu nhom dong bo'));
        } finally {
            setSaving(false);
        }
    }, [canSave, editingId, expectedVersion, idDonVi, initialParameters, onClose, onSaved, selectedItems, tenNhom]);

    return (
        <FormDialog
            open={open}
            onClose={onClose}
            title={isEditMode ? 'Cap nhat nhom dong bo' : 'Tao nhom dong bo'}
            subtitle={isEditMode ? 'Chinh sua thong tin va danh sach trang bi trong nhom' : 'Tao nhom dong bo moi tu danh sach trang bi'}
            mode={isEditMode ? 'edit' : 'add'}
            maxWidth="lg"
            loading={saving}
            onConfirm={handleSave}
            confirmText={isEditMode ? 'Cap nhat nhom' : 'Tao nhom'}
            cancelText="Dong"
            disabled={!canSave}
        >
            <Stack spacing={1.5}>
                {recordError && <Alert severity="error">{recordError}</Alert>}
                {saveError && <Alert severity="error">{saveError}</Alert>}

                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.25}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Ten nhom"
                        placeholder="Nhap ten nhom dong bo"
                        value={tenNhom}
                        onChange={(event) => setTenNhom(event.target.value)}
                        disabled={recordLoading}
                    />

                    <Autocomplete
                        fullWidth
                        size="small"
                        options={officeOptions}
                        loading={officeLoading}
                        value={officeValue}
                        onChange={(_event, option) => setIdDonVi(option?.value ?? '')}
                        getOptionLabel={(option) => option.label}
                        isOptionEqualToValue={(option, value) => option.value === value.value}
                        disabled={recordLoading}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Don vi"
                                placeholder="Chon don vi quan ly nhom"
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
                </Stack>

                <TextField
                    fullWidth
                    size="small"
                    label="Tim trang bi"
                    placeholder="Nhap ten, ma danh muc, so hieu..."
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    disabled={recordLoading}
                    slotProps={{
                        input: {
                            startAdornment: <SearchIcon fontSize="small" sx={{ mr: 0.75, opacity: 0.7 }} />,
                            endAdornment: searchText
                                ? (
                                    <IconButton size="small" onClick={() => setSearchText('')}>
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                )
                                : null,
                        },
                    }}
                />

                {searchError && <Alert severity="warning">{searchError}</Alert>}

                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                    <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 72 }}>Nhom</TableCell>
                                <TableCell>Ma danh muc</TableCell>
                                <TableCell>Ten danh muc</TableCell>
                                <TableCell>So hieu</TableCell>
                                <TableCell align="right" sx={{ width: 96 }}>Tac vu</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {searchLoading && (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <Stack direction="row" spacing={1} alignItems="center" py={1}>
                                            <CircularProgress size={16} />
                                            <Typography variant="body2" color="text.secondary">Dang tim trang bi...</Typography>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            )}

                            {!searchLoading && searchResults.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <Typography variant="body2" color="text.secondary" py={1}>
                                            Nhap toi thieu 2 ky tu de tim, hoac hien tai khong co ket qua.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}

                            {!searchLoading && searchResults.map((item) => {
                                const key = buildCandidateKey(item);
                                const alreadySelected = selectedKeySet.has(key);
                                const blocked = isBlockedByOtherGroup(item);
                                const disabled = alreadySelected || blocked;

                                return (
                                    <TableRow key={key} hover>
                                        <TableCell>{item.nhom}</TableCell>
                                        <TableCell>{item.maDanhMuc || '-'}</TableCell>
                                        <TableCell>{item.tenDanhMuc || '-'}</TableCell>
                                        <TableCell>{item.soHieu || '-'}</TableCell>
                                        <TableCell align="right">
                                            <Button
                                                size="small"
                                                startIcon={<AddLinkIcon fontSize="small" />}
                                                disabled={disabled}
                                                onClick={() => handleAddCandidate(item)}
                                            >
                                                {blocked ? 'Da thuoc nhom khac' : alreadySelected ? 'Da chon' : 'Them'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>

                <Typography variant="subtitle2" fontWeight={700}>
                    Danh sach trang bi trong nhom ({selectedItems.length})
                </Typography>

                <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 72 }}>Nhom</TableCell>
                                <TableCell>Ma danh muc</TableCell>
                                <TableCell>Ten danh muc</TableCell>
                                <TableCell>So hieu</TableCell>
                                <TableCell align="right" sx={{ width: 96 }}>Tac vu</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {selectedItems.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5}>
                                        <Typography variant="body2" color="text.secondary" py={1}>
                                            Chua co trang bi nao trong nhom.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}

                            {selectedItems.map((item) => {
                                const key = buildCandidateKey(item);
                                return (
                                    <TableRow key={key} hover>
                                        <TableCell>{item.nhom}</TableCell>
                                        <TableCell>{item.maDanhMuc || '-'}</TableCell>
                                        <TableCell>{item.tenDanhMuc || '-'}</TableCell>
                                        <TableCell>{item.soHieu || '-'}</TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small" color="error" onClick={() => handleRemoveSelected(item)}>
                                                <DeleteOutlineIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>

                <Alert severity="info">
                    Mỗi trang bi chi duoc thuoc toi da 1 nhom dong bo. He thong se chan ngay khi trang bi da gan nhom khac.
                </Alert>
            </Stack>
        </FormDialog>
    );
};

export default NhomDongBoManageDialog;
