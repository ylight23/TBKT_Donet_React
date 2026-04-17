// ============================================================
// SyncMembersTab – Tab quản lý danh sách trang bị đồng bộ
// Hỗ trợ ảo hóa danh sách (useVirtualizer) cho 1000+ bản ghi
// ============================================================
import React, { useRef, useCallback, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Divider from '@mui/material/Divider';
import { useTheme, alpha } from '@mui/material/styles';
import { useVirtualizer } from '@tanstack/react-virtual';

import AddIcon from '@mui/icons-material/Add';
import AddLinkIcon from '@mui/icons-material/AddLink';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import GroupIcon from '@mui/icons-material/Group';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BlockIcon from '@mui/icons-material/Block';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

import { militaryColors } from '../../theme';

// ── Types (re-defined locally to avoid circular imports) ────
export interface SyncEquipmentItem {
  id: string;
  nhom: 1 | 2;
  maDanhMuc: string;
  tenDanhMuc: string;
  soHieu: string;
  idNhomDongBo?: string;
}

export interface SyncGroupMeta {
  id: string;
  tenNhom: string;
  idDonVi: string;
  parameters: Record<string, string>;
  expectedVersion?: number;
}

export interface SyncMembersTabProps {
  // --- dữ liệu tìm kiếm ---
  syncSearchText: string;
  onSearchTextChange: (text: string) => void;
  syncSearchResults: SyncEquipmentItem[];
  syncSearchLoading: boolean;
  syncSearchError: string;
  onClearSearchError: () => void;
  syncGroupLoading: boolean;
  syncGroupMeta: SyncGroupMeta | null;
  // --- danh sách đã chọn ---
  syncMembers: SyncEquipmentItem[];
  selectedSyncMemberKeys: Set<string>;
  // --- handlers ---
  onAdd: (item: SyncEquipmentItem) => void;
  onRemove: (item: SyncEquipmentItem) => void;
  canAttachToCurrentGroup: (item: SyncEquipmentItem) => boolean;
  buildKey: (item: Pick<SyncEquipmentItem, 'id' | 'nhom'>) => string;
}

// ── Chip màu theo Nhóm ────────────────────────────────────────
const NHOM_CHIP = {
  1: { label: 'Nhóm 1', bg: 'rgba(55,138,221,0.1)', color: '#1a6ab0', border: 'rgba(55,138,221,0.25)' },
  2: { label: 'Nhóm 2', bg: 'rgba(34,197,94,0.1)', color: '#166534', border: 'rgba(34,197,94,0.25)' },
} as const;

const NhomBadge: React.FC<{ nhom: 1 | 2 }> = ({ nhom }) => {
  const c = NHOM_CHIP[nhom];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 0.9,
        py: 0.2,
        borderRadius: '10px',
        border: `1px solid ${c.border}`,
        bgcolor: c.bg,
        color: c.color,
        fontSize: '0.68rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        lineHeight: 1.6,
      }}
    >
      {c.label}
    </Box>
  );
};

// ── Hằng số chiều cao hàng (px) cho virtualizer ──────────────
const ROW_HEIGHT = 40;
const SEARCH_LIST_MAX_ROWS = 7;
const MEMBERS_LIST_HEIGHT = 320;

// ── Component chính ───────────────────────────────────────────
const SyncMembersTab: React.FC<SyncMembersTabProps> = ({
  syncSearchText,
  onSearchTextChange,
  syncSearchResults,
  syncSearchLoading,
  syncSearchError,
  onClearSearchError,
  syncGroupLoading,
  syncGroupMeta,
  syncMembers,
  selectedSyncMemberKeys,
  onAdd,
  onRemove,
  canAttachToCurrentGroup,
  buildKey,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [searchPanelOpen, setSearchPanelOpen] = useState(false);

  // filter text for members list
  const [memberFilter, setMemberFilter] = useState('');

  const filteredMembers = useMemo(() => {
    const q = memberFilter.trim().toLowerCase();
    if (!q) return syncMembers;
    return syncMembers.filter(
      (m) =>
        m.tenDanhMuc.toLowerCase().includes(q) ||
        m.maDanhMuc.toLowerCase().includes(q) ||
        m.soHieu.toLowerCase().includes(q),
    );
  }, [syncMembers, memberFilter]);

  // ── Virtualizer cho danh sách đã chọn ────────────────────
  const membersParentRef = useRef<HTMLDivElement>(null);
  const membersVirtualizer = useVirtualizer({
    count: filteredMembers.length,
    getScrollElement: () => membersParentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  // ── Virtualizer cho kết quả tìm kiếm ─────────────────────
  const searchParentRef = useRef<HTMLDivElement>(null);
  const searchVirtualizer = useVirtualizer({
    count: syncSearchResults.length,
    getScrollElement: () => searchParentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  const isSearching = syncSearchLoading || syncGroupLoading;
  const hasQuery = syncSearchText.trim().length >= 2;

  const searchListHeight = Math.min(
    syncSearchResults.length * ROW_HEIGHT + 2,
    SEARCH_LIST_MAX_ROWS * ROW_HEIGHT,
  );

  const bg = isDark ? 'rgba(255,255,255,0.03)' : '#fff';
  const border = isDark ? 'rgba(255,255,255,0.08)' : theme.palette.divider;
  const rowHover = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)';

  const headerCellSx = {
    px: 1.25,
    py: 0.6,
    fontSize: '0.72rem',
    fontWeight: 600,
    color: 'text.secondary',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.3px',
    bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'grey.50',
    borderBottom: `1px solid ${border}`,
    userSelect: 'none' as const,
  };

  return (
    <Stack spacing={1.75}>
      {/* ── Header bar ─────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" spacing={1} useFlexGap>
        <Stack direction="row" alignItems="center" spacing={1}>
          <GroupIcon sx={{ fontSize: 16, color: militaryColors.navy, opacity: 0.8 }} />
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.82rem' }}>
            Trang bị chuyên ngành biên chế đồng bộ
          </Typography>
          <Chip
            size="small"
            label={syncMembers.length}
            color={syncMembers.length > 0 ? 'success' : 'default'}
            sx={{ height: 20, fontSize: '0.72rem', fontWeight: 700, '& .MuiChip-label': { px: 1 } }}
          />
        </Stack>
        <Button
          size="small"
          variant={searchPanelOpen ? 'contained' : 'outlined'}
          startIcon={searchPanelOpen ? <ExpandLessIcon fontSize="small" /> : <AddIcon fontSize="small" />}
          onClick={() => setSearchPanelOpen((v) => !v)}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8rem',
            px: 1.5,
            py: 0.4,
            borderRadius: 1.5,
            ...(searchPanelOpen
              ? { bgcolor: militaryColors.navy, '&:hover': { bgcolor: militaryColors.navy, filter: 'brightness(1.1)' } }
              : { borderColor: border }),
          }}
        >
          {searchPanelOpen ? 'Thu gọn tìm kiếm' : 'Thêm trang bị đồng bộ'}
        </Button>
      </Stack>

      {syncGroupMeta && (
        <Alert
          icon={<CheckCircleOutlineIcon fontSize="small" />}
          severity="info"
          sx={{ py: 0.4, fontSize: '0.8rem', borderRadius: 1.5 }}
        >
          Nhóm đồng bộ: <strong>{syncGroupMeta.tenNhom || syncGroupMeta.id}</strong>
        </Alert>
      )}

      {/* ── Panel tìm kiếm & thêm ──────────────────────────── */}
      {searchPanelOpen && (
        <Box
          sx={{
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : alpha(militaryColors.navy, 0.2)}`,
            borderRadius: 2,
            overflow: 'hidden',
            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : alpha(militaryColors.navy, 0.015),
          }}
        >
          {/* Search input */}
          <Box sx={{ px: 1.5, py: 1.25, borderBottom: `1px solid ${border}` }}>
            <TextField
              fullWidth
              size="small"
              autoFocus
              value={syncSearchText}
              onChange={(e) => onSearchTextChange(e.target.value)}
              placeholder="Nhập tên danh mục, mã, số hiệu... (tối thiểu 2 ký tự)"
              slotProps={{
                input: {
                  startAdornment: isSearching
                    ? <CircularProgress size={14} sx={{ mr: 1, flexShrink: 0 }} />
                    : <SearchIcon fontSize="small" sx={{ mr: 0.75, opacity: 0.55, flexShrink: 0 }} />,
                },
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontSize: '0.83rem',
                  borderRadius: 1.5,
                  bgcolor: bg,
                  '& fieldset': { borderColor: border },
                  '&:hover fieldset': { borderColor: isDark ? 'rgba(255,255,255,0.2)' : alpha(militaryColors.navy, 0.4) },
                  '&.Mui-focused fieldset': { borderColor: militaryColors.navy },
                },
              }}
            />
          </Box>

          {syncSearchError && (
            <Alert severity="warning" onClose={onClearSearchError} sx={{ m: 1.25, py: 0.4, fontSize: '0.8rem' }}>
              {syncSearchError}
            </Alert>
          )}

          {/* Kết quả tìm kiếm */}
          {!hasQuery && !isSearching && (
            <Box sx={{ px: 1.5, py: 1.5, textAlign: 'center', color: 'text.disabled' }}>
              <SearchIcon sx={{ fontSize: 28, mb: 0.5, opacity: 0.3 }} />
              <Typography variant="caption" display="block" sx={{ fontSize: '0.78rem' }}>
                Nhập tối thiểu 2 ký tự để tìm trang bị
              </Typography>
            </Box>
          )}

          {hasQuery && !isSearching && syncSearchResults.length === 0 && (
            <Box sx={{ px: 1.5, py: 1.5, textAlign: 'center', color: 'text.disabled' }}>
              <Typography variant="caption" display="block" sx={{ fontSize: '0.78rem' }}>
                Không tìm thấy trang bị phù hợp với "{syncSearchText}"
              </Typography>
            </Box>
          )}

          {hasQuery && (isSearching || syncSearchResults.length > 0) && (
            <>
              {/* Header */}
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 72px auto 80px', bgcolor: isDark ? 'rgba(255,255,255,0.03)' : 'grey.50', borderBottom: `1px solid ${border}` }}>
                <Box sx={headerCellSx}>Tên / Mã danh mục</Box>
                <Box sx={headerCellSx}>Nhóm</Box>
                <Box sx={headerCellSx}>Số hiệu</Box>
                <Box sx={{ ...headerCellSx, textAlign: 'right' }} />
              </Box>

              {/* Virtual rows */}
              <Box
                ref={searchParentRef}
                sx={{ height: isSearching ? 80 : searchListHeight, overflowY: 'auto', position: 'relative' }}
              >
                {isSearching ? (
                  <Stack alignItems="center" justifyContent="center" sx={{ height: '100%' }} spacing={0.75}>
                    <CircularProgress size={20} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      Đang tìm kiếm...
                    </Typography>
                  </Stack>
                ) : (
                  <Box sx={{ height: searchVirtualizer.getTotalSize(), position: 'relative' }}>
                    {searchVirtualizer.getVirtualItems().map((vItem) => {
                      const item = syncSearchResults[vItem.index];
                      const key = buildKey(item);
                      const alreadySelected = selectedSyncMemberKeys.has(key);
                      const blocked = Boolean(item.idNhomDongBo) && !canAttachToCurrentGroup(item);
                      const disabled = alreadySelected || blocked;

                      return (
                        <Box
                          key={key}
                          data-index={vItem.index}
                          ref={searchVirtualizer.measureElement}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            transform: `translateY(${vItem.start}px)`,
                            display: 'grid',
                            gridTemplateColumns: '1fr 72px auto 80px',
                            alignItems: 'center',
                            minHeight: ROW_HEIGHT,
                            px: 0,
                            borderBottom: `1px solid ${border}`,
                            bgcolor: alreadySelected ? (isDark ? 'rgba(34,197,94,0.07)' : 'rgba(34,197,94,0.04)') : 'transparent',
                            '&:hover': { bgcolor: disabled ? undefined : rowHover },
                            opacity: blocked ? 0.5 : 1,
                          }}
                        >
                          <Box sx={{ px: 1.25, py: 0.5, minWidth: 0 }}>
                            <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.tenDanhMuc || item.maDanhMuc || item.id}
                            </Typography>
                            {item.maDanhMuc && (
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                                {item.maDanhMuc}
                              </Typography>
                            )}
                          </Box>
                          <Box sx={{ px: 1 }}>
                            <NhomBadge nhom={item.nhom} />
                          </Box>
                          <Box sx={{ px: 1, color: 'text.secondary', fontSize: '0.8rem' }}>
                            {item.soHieu || '—'}
                          </Box>
                          <Box sx={{ px: 1, textAlign: 'right' }}>
                            <Tooltip title={blocked ? 'Đã thuộc nhóm khác' : alreadySelected ? 'Đã chọn' : 'Thêm vào danh sách'}>
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={disabled}
                                  onClick={() => onAdd(item)}
                                  sx={{
                                    borderRadius: 1,
                                    width: 28,
                                    height: 28,
                                    color: alreadySelected ? 'success.main' : militaryColors.navy,
                                    bgcolor: alreadySelected
                                      ? (isDark ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.08)')
                                      : (isDark ? 'rgba(255,255,255,0.05)' : alpha(militaryColors.navy, 0.06)),
                                    '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.1)' : alpha(militaryColors.navy, 0.12) },
                                    '&.Mui-disabled': { opacity: 0.4 },
                                  }}
                                >
                                  {blocked ? <BlockIcon sx={{ fontSize: 14 }} /> : alreadySelected ? <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> : <AddLinkIcon sx={{ fontSize: 14 }} />}
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            </>
          )}
        </Box>
      )}

      {/* ── Danh sách đã chọn ──────────────────────────────── */}
      <Box
        sx={{
          border: `1px solid ${border}`,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: bg,
        }}
      >
        {/* Header row + filter */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{
            px: 1.5,
            py: 0.75,
            borderBottom: `1px solid ${border}`,
            bgcolor: isDark ? 'rgba(255,255,255,0.02)' : 'grey.50',
          }}
        >
          <Typography variant="body2" sx={{ fontSize: '0.78rem', fontWeight: 700, color: 'text.secondary', flexShrink: 0 }}>
            ĐÃ CHỌN
          </Typography>
          <Chip
            size="small"
            label={filteredMembers.length === syncMembers.length ? syncMembers.length : `${filteredMembers.length}/${syncMembers.length}`}
            sx={{ height: 18, fontSize: '0.68rem', fontWeight: 700, '& .MuiChip-label': { px: 0.75 } }}
          />
          {syncMembers.length > 8 && (
            <>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <TextField
                size="small"
                value={memberFilter}
                onChange={(e) => setMemberFilter(e.target.value)}
                placeholder="Lọc nhanh..."
                sx={{
                  flex: 1,
                  maxWidth: 220,
                  '& .MuiOutlinedInput-root': {
                    fontSize: '0.78rem',
                    height: 26,
                    borderRadius: 1.5,
                    '& input': { py: 0.25, px: 1 },
                    '& fieldset': { borderColor: border },
                  },
                }}
                slotProps={{ input: { startAdornment: <SearchIcon sx={{ fontSize: 12, mr: 0.5, opacity: 0.45 }} /> } }}
              />
            </>
          )}
        </Stack>

        {/* Column headers */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 72px auto 36px', borderBottom: `1px solid ${border}` }}>
          <Box sx={headerCellSx}>Tên trang bị đồng bộ</Box>
          <Box sx={headerCellSx}>Nhóm</Box>
          <Box sx={headerCellSx}>Số hiệu</Box>
          <Box sx={{ ...headerCellSx, textAlign: 'center' }} />
        </Box>

        {/* Empty state */}
        {syncMembers.length === 0 && (
          <Box sx={{ py: 5, textAlign: 'center', color: 'text.disabled' }}>
            <GroupIcon sx={{ fontSize: 32, mb: 1, opacity: 0.2 }} />
            <Typography variant="body2" sx={{ fontSize: '0.8rem', fontWeight: 500 }}>
              Chưa có trang bị đồng bộ nào được thêm
            </Typography>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.74rem', mt: 0.5, display: 'block' }}>
              Nhấn "Thêm trang bị đồng bộ" để bắt đầu tìm kiếm và thêm
            </Typography>
          </Box>
        )}

        {filteredMembers.length === 0 && syncMembers.length > 0 && (
          <Box sx={{ py: 3, textAlign: 'center', color: 'text.disabled' }}>
            <Typography variant="caption" sx={{ fontSize: '0.78rem' }}>
              Không có kết quả cho "{memberFilter}"
            </Typography>
          </Box>
        )}

        {/* Virtual list */}
        {filteredMembers.length > 0 && (
          <Box
            ref={membersParentRef}
            sx={{
              height: Math.min(filteredMembers.length * ROW_HEIGHT + 2, MEMBERS_LIST_HEIGHT),
              overflowY: 'auto',
              position: 'relative',
            }}
          >
            <Box sx={{ height: membersVirtualizer.getTotalSize(), position: 'relative' }}>
              {membersVirtualizer.getVirtualItems().map((vItem) => {
                const item = filteredMembers[vItem.index];
                const key = buildKey(item);
                const isLast = vItem.index === filteredMembers.length - 1;

                return (
                  <Box
                    key={key}
                    data-index={vItem.index}
                    ref={membersVirtualizer.measureElement}
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      transform: `translateY(${vItem.start}px)`,
                      display: 'grid',
                      gridTemplateColumns: '1fr 72px auto 36px',
                      alignItems: 'center',
                      minHeight: ROW_HEIGHT,
                      borderBottom: isLast ? 'none' : `1px solid ${border}`,
                      '&:hover': { bgcolor: rowHover },
                      '&:hover .delete-btn': { opacity: 1 },
                    }}
                  >
                    <Box sx={{ px: 1.25, py: 0.5, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.tenDanhMuc || item.maDanhMuc || item.id}
                      </Typography>
                      {item.maDanhMuc && (
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
                          {item.maDanhMuc}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ px: 1 }}>
                      <NhomBadge nhom={item.nhom} />
                    </Box>
                    <Box sx={{ px: 1, color: 'text.secondary', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                      {item.soHieu || '—'}
                    </Box>
                    <Box sx={{ px: 0.5, textAlign: 'center' }}>
                      <IconButton
                        size="small"
                        className="delete-btn"
                        onClick={() => onRemove(item)}
                        sx={{
                          opacity: 0,
                          width: 26,
                          height: 26,
                          borderRadius: 1,
                          color: 'text.disabled',
                          transition: 'opacity 0.15s, color 0.15s, background-color 0.15s',
                          '&:hover': { color: 'error.main', bgcolor: 'rgba(239,68,68,0.08)' },
                        }}
                      >
                        <DeleteOutlineIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Box>

      {/* ── Ghi chú ────────────────────────────────────────── */}
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{
          fontSize: '0.74rem',
          px: 0.5,
          display: 'block',
          lineHeight: 1.5,
        }}
      >
        Các đơn vị chuyên ngành phụ trách sẽ thấy trang bị này trong danh sách quản lý bảo dưỡng của họ.
        {syncMembers.length > 100 && (
          <> · Danh sách được ảo hóa để hiển thị tối ưu ({syncMembers.length} bản ghi).</>
        )}
      </Typography>
    </Stack>
  );
};

export default SyncMembersTab;
