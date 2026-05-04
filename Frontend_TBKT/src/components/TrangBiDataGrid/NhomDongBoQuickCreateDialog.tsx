import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import AddLinkIcon from '@mui/icons-material/AddLink';
import ClearIcon from '@mui/icons-material/Clear';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';

import { FormDialog } from '../Dialog';
import officeApi, { type OfficeListOption } from '../../apis/officeApi';
import nhomDongBoApi from '../../apis/nhomDongBoApi';
import trangBiKiThuatApi from '../../apis/trangBiKiThuatApi';
import { useMyPermissions } from '../../hooks/useMyPermissions';

interface CurrentEquipmentDraft {
  id?: string;
  nhom: 1 | 2;
  maDanhMuc?: string;
  tenDanhMuc?: string;
  soHieu?: string;
}

interface CandidateTrangBiItem {
  id: string;
  nhom: 1 | 2;
  maDanhMuc: string;
  tenDanhMuc: string;
  soHieu: string;
  idCapTren: string;
  idChuyenNganhKt: string;
  idNganh: string;
  idNhomDongBo?: string;
  trangThaiDongBo: boolean;
}

interface NhomDongBoQuickCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (payload: { id: string; tenNhom: string }) => void;
  currentEquipment?: CurrentEquipmentDraft;
  suggestedOfficeId?: string;
}

const buildCandidateKey = (item: Pick<CandidateTrangBiItem, 'id' | 'nhom'>): string =>
  `${item.nhom}:${item.id}`;

const createDefaultGroupName = (currentEquipment?: CurrentEquipmentDraft): string => {
  const base = String(currentEquipment?.tenDanhMuc ?? currentEquipment?.maDanhMuc ?? '').trim();
  return base ? `Nhom dong bo ${base}` : 'Nhom dong bo moi';
};

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
  idCapTren: String(item.idCapTren ?? '').trim(),
  idChuyenNganhKt: String(item.idChuyenNganhKt ?? '').trim(),
  idNganh: String(item.idNganh ?? '').trim(),
  idNhomDongBo: item.idNhomDongBo ? String(item.idNhomDongBo).trim() : undefined,
  trangThaiDongBo: Boolean(item.trangThaiDongBo),
});

const NhomDongBoQuickCreateDialog: React.FC<NhomDongBoQuickCreateDialogProps> = ({
  open,
  onClose,
  onCreated,
  currentEquipment,
  suggestedOfficeId,
}) => {
  const theme = useTheme();
  const { canCnAction } = useMyPermissions();
  const [tenNhom, setTenNhom] = useState('');
  const [idDonVi, setIdDonVi] = useState('');
  const [officeOptions, setOfficeOptions] = useState<OfficeListOption[]>([]);
  const [officeLoading, setOfficeLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [searchResults, setSearchResults] = useState<CandidateTrangBiItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<CandidateTrangBiItem[]>([]);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTenNhom(createDefaultGroupName(currentEquipment));
    setIdDonVi(String(suggestedOfficeId ?? '').trim());
    setSearchText('');
    setSearchResults([]);
    setSelectedItems([]);
    setSearchError('');
    setSaveError('');
    setSaving(false);
  }, [open, currentEquipment, suggestedOfficeId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setOfficeLoading(true);

    officeApi.getListOfficeOptions()
      .then((items) => {
        if (!cancelled) {
          setOfficeOptions(items);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setSaveError(String((error as Error)?.message || 'Khong the tai danh sach don vi'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOfficeLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

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
          if (cancelled) {
            return;
          }

          const currentId = String(currentEquipment?.id ?? '').trim();
          const merged = [
            ...nhom1.map((item) => mapTrangBiListItem(1, item)),
            ...nhom2.map((item) => mapTrangBiListItem(2, item)),
          ].filter((item) => item.id && item.id !== currentId);

          setSearchResults(merged);
        })
        .catch((error) => {
          if (!cancelled) {
            setSearchError(String((error as Error)?.message || 'Khong the tai danh sach trang bi dong bo'));
            setSearchResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearchLoading(false);
          }
        });
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, searchText, currentEquipment?.id]);

  const selectedKeySet = useMemo(
    () => new Set(selectedItems.map((item) => buildCandidateKey(item))),
    [selectedItems],
  );

  const officeValue = useMemo(
    () => officeOptions.find((item) => item.value === idDonVi) ?? null,
    [idDonVi, officeOptions],
  );

  const canCreateWithoutAdditionalSelection = Boolean(String(currentEquipment?.id ?? '').trim());
  const totalItemsOnCreate = selectedItems.length + (canCreateWithoutAdditionalSelection ? 1 : 0);

  const handleAddCandidate = useCallback((item: CandidateTrangBiItem) => {
    if (item.idNhomDongBo) {
      return;
    }

    setSelectedItems((prev) => {
      const key = buildCandidateKey(item);
      if (prev.some((entry) => buildCandidateKey(entry) === key)) {
        return prev;
      }

      return [...prev, item];
    });
  }, []);

  const handleRemoveCandidate = useCallback((item: CandidateTrangBiItem) => {
    const key = buildCandidateKey(item);
    setSelectedItems((prev) => prev.filter((entry) => buildCandidateKey(entry) !== key));
  }, []);

  const handleSave = useCallback(async () => {
    const normalizedTenNhom = tenNhom.trim();
    const normalizedIdDonVi = idDonVi.trim();

    if (!normalizedTenNhom) {
      setSaveError('Vui long nhap ten nhom dong bo.');
      return;
    }

    if (!normalizedIdDonVi) {
      setSaveError('Vui long chon don vi cho nhom dong bo.');
      return;
    }

    const payloadRefs = new Map<string, { id: string; nhom: 1 | 2 }>();

    selectedItems.forEach((item) => {
      payloadRefs.set(buildCandidateKey(item), { id: item.id, nhom: item.nhom });
    });

    const currentId = String(currentEquipment?.id ?? '').trim();
    if (currentId) {
      payloadRefs.set(buildCandidateKey({ id: currentId, nhom: currentEquipment?.nhom ?? 1 }), {
        id: currentId,
        nhom: currentEquipment?.nhom ?? 1,
      });
    }

    if (payloadRefs.size === 0) {
      setSaveError('Can chon it nhat 1 trang bi dong bo de tao nhom.');
      return;
    }

    // CN authorization check: tất cả trang bị trong nhóm phải thuộc CN mà user có quyền add/edit
    const isNewGroup = !currentEquipment?.id;
    const cnAction = isNewGroup ? 'add' : 'edit';
    const unauthorizedItem = selectedItems.find(
      (item) => item.idChuyenNganhKt && !canCnAction(cnAction, item.idChuyenNganhKt),
    );
    if (unauthorizedItem) {
      setSaveError(`Bạn không có quyền ${cnAction === 'add' ? 'thêm' : 'chỉnh sửa'} trang bị thuộc chuyên ngành "${unauthorizedItem.idChuyenNganhKt}".`);
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const result = await nhomDongBoApi.saveNhomDongBo({
        tenNhom: normalizedTenNhom,
        idDonVi: normalizedIdDonVi,
        dsTrangBi: Array.from(payloadRefs.values()),
        parameters: {},
      });

      onCreated({
        id: result.id,
        tenNhom: normalizedTenNhom,
      });
    } catch (error) {
      setSaveError(String((error as Error)?.message || 'Khong the tao nhom dong bo'));
    } finally {
      setSaving(false);
    }
  }, [currentEquipment, idDonVi, onCreated, selectedItems, tenNhom]);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      mode="add"
      maxWidth="lg"
      title="Tao nhom dong bo"
      subtitle="Tao nhanh nhom dong bo de picker trong form trang bi co the su dung ngay"
      icon={<AddLinkIcon />}
      onConfirm={handleSave}
      confirmText="Tao nhom"
      loading={saving}
      sx={{
        '& .MuiDialog-paper': {
          width: 'min(1120px, calc(100vw - 32px))',
          maxHeight: '88vh',
        },
      }}
    >
      <Stack spacing={2}>
        {saveError && (
          <Alert severity="error" onClose={() => setSaveError('')}>
            {saveError}
          </Alert>
        )}

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            borderRadius: 2.5,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.02)} 100%)`,
          }}
        >
          <Stack spacing={1.25}>
            <Typography variant="subtitle1" fontWeight={800}>
              Ngu canh tao nhom
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {currentEquipment?.id
                ? 'Trang bi hien tai da ton tai va se duoc dua vao nhom ngay khi tao.'
                : 'Trang bi hien tai dang o form them moi. Sau khi tao nhom, ban ghi nay se duoc gan vao nhom khi luu trang bi.'}
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {currentEquipment?.tenDanhMuc && (
                <Chip
                  label={`Trang bi hien tai: ${currentEquipment.tenDanhMuc}`}
                  color="primary"
                  variant="outlined"
                  sx={{ fontWeight: 700 }}
                />
              )}
              {currentEquipment?.maDanhMuc && (
                <Chip
                  label={`Ma danh muc: ${currentEquipment.maDanhMuc}`}
                  variant="outlined"
                />
              )}
              <Chip
                label={`Tong thanh vien khi tao: ${totalItemsOnCreate}`}
                color={totalItemsOnCreate > 0 ? 'success' : 'default'}
                variant={totalItemsOnCreate > 0 ? 'filled' : 'outlined'}
              />
            </Stack>
          </Stack>
        </Paper>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            label="Ten nhom"
            value={tenNhom}
            onChange={(event) => setTenNhom(event.target.value)}
            fullWidth
            size="small"
          />

          <Autocomplete
            options={officeOptions}
            loading={officeLoading}
            value={officeValue}
            onChange={(_, option) => setIdDonVi(option?.value ?? '')}
            getOptionLabel={(option) => option.label}
            isOptionEqualToValue={(option, value) => option.value === value.value}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Don vi"
                size="small"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {officeLoading ? <CircularProgress color="inherit" size={16} /> : null}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
            fullWidth
          />
        </Stack>

        <Divider />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1.1fr 0.9fr' },
            gap: 2,
            minHeight: 360,
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: alpha(theme.palette.primary.main, 0.04),
              }}
            >
              <SearchIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" fontWeight={800}>
                Tim trang bi de dua vao nhom
              </Typography>
            </Stack>

            <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <TextField
                fullWidth
                size="small"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Tim theo ten danh muc, ma danh muc, so hieu..."
                InputProps={{
                  startAdornment: <SearchIcon fontSize="small" color="action" sx={{ mr: 1 }} />,
                }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Nhap toi thieu 2 ky tu. Ket qua dang goi tu API nhom 1 va nhom 2.
              </Typography>
            </Box>

            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {searchError && (
                <Box sx={{ p: 2 }}>
                  <Alert severity="warning">{searchError}</Alert>
                </Box>
              )}

              {searchLoading ? (
                <Stack alignItems="center" justifyContent="center" spacing={1.25} sx={{ py: 6 }}>
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary">
                    Dang tim trang bi...
                  </Typography>
                </Stack>
              ) : searchText.trim().length < 2 ? (
                <Box sx={{ p: 3, color: 'text.secondary' }}>
                  <Typography variant="body2">
                    Tim kiem trang bi dong bo de lap nhom ban dau.
                  </Typography>
                </Box>
              ) : searchResults.length === 0 ? (
                <Box sx={{ p: 3, color: 'text.secondary' }}>
                  <Typography variant="body2">
                    Khong tim thay trang bi phu hop.
                  </Typography>
                </Box>
              ) : (
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Nhom</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Ten danh muc</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>So hieu</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 130 }}>Tac vu</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {searchResults.map((item) => {
                      const key = buildCandidateKey(item);
                      const alreadySelected = selectedKeySet.has(key);
                      const linkedElsewhere = Boolean(item.idNhomDongBo);

                      return (
                        <TableRow key={key} hover>
                          <TableCell>
                            <Chip
                              size="small"
                              label={`Nhom ${item.nhom}`}
                              color={item.nhom === 1 ? 'primary' : 'secondary'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.25}>
                              <Typography variant="body2" fontWeight={700}>
                                {item.tenDanhMuc || item.maDanhMuc || item.id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.maDanhMuc}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{item.soHieu || '-'}</Typography>
                          </TableCell>
                          <TableCell>
                            {linkedElsewhere ? (
                              <Chip size="small" color="warning" label="Da co nhom" />
                            ) : alreadySelected ? (
                              <Chip size="small" color="success" label="Da chon" />
                            ) : (
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleAddCandidate(item)}
                                sx={{ textTransform: 'none', fontWeight: 700 }}
                              >
                                Them
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Paper>

          <Paper
            variant="outlined"
            sx={{
              borderRadius: 2.5,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: alpha(theme.palette.success.main, 0.05),
              }}
            >
              <Typography variant="subtitle2" fontWeight={800}>
                Thanh vien se co trong nhom
              </Typography>
              <Chip
                size="small"
                color={selectedItems.length > 0 ? 'success' : 'default'}
                label={`${selectedItems.length} trang bi bo sung`}
              />
            </Stack>

            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {currentEquipment && (
                <Box sx={{ p: 2, borderBottom: '1px dashed', borderColor: 'divider' }}>
                  <Typography variant="caption" color="text.secondary">
                    Trang bi hien tai
                  </Typography>
                  <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center" sx={{ mt: 0.75 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>
                        {currentEquipment.tenDanhMuc || currentEquipment.maDanhMuc || 'Trang bi dang thao tac'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {currentEquipment.id
                          ? 'Se duoc tao lien ket ngay khi tao nhom'
                          : 'Se duoc gan vao nhom sau khi luu trang bi'}
                      </Typography>
                    </Box>
                    <Chip size="small" label={`Nhom ${currentEquipment.nhom}`} color="primary" variant="outlined" />
                  </Stack>
                </Box>
              )}

              {selectedItems.length === 0 ? (
                <Box sx={{ p: 3, color: 'text.secondary' }}>
                  <Typography variant="body2">
                    Chua co trang bi nao duoc them vao nhom.
                  </Typography>
                </Box>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Nhom</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Ten danh muc</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>So hieu</TableCell>
                      <TableCell sx={{ fontWeight: 800, width: 60 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {selectedItems.map((item) => {
                      const key = buildCandidateKey(item);
                      return (
                        <TableRow key={key} hover>
                          <TableCell>
                            <Chip
                              size="small"
                              label={`Nhom ${item.nhom}`}
                              color={item.nhom === 1 ? 'primary' : 'secondary'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Stack spacing={0.25}>
                              <Typography variant="body2" fontWeight={700}>
                                {item.tenDanhMuc || item.maDanhMuc || item.id}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {item.maDanhMuc}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>{item.soHieu || '-'}</TableCell>
                          <TableCell align="right">
                            <IconButton size="small" onClick={() => handleRemoveCandidate(item)}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </Box>

            {selectedItems.length > 0 && (
              <Stack direction="row" justifyContent="flex-end" sx={{ p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
                <Button
                  size="small"
                  startIcon={<ClearIcon />}
                  onClick={() => setSelectedItems([])}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  Xoa danh sach da chon
                </Button>
              </Stack>
            )}
          </Paper>
        </Box>
      </Stack>
    </FormDialog>
  );
};

export default NhomDongBoQuickCreateDialog;
