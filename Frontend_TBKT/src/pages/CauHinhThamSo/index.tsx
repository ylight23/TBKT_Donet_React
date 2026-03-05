import React, { useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';

import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import BuildIcon from '@mui/icons-material/Build';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

// MUI icons replacing emoji in FIELD_TYPES
import TextFieldsIcon from '@mui/icons-material/TextFields';
import NumbersIcon from '@mui/icons-material/Numbers';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ListIcon from '@mui/icons-material/List';
import SubjectIcon from '@mui/icons-material/Subject';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

// MUI icons replacing emoji in LOG_TYPES
import ShieldIcon from '@mui/icons-material/Shield';
import HandymanIcon from '@mui/icons-material/Handyman';
import ConstructionIcon from '@mui/icons-material/Construction';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TimerIcon from '@mui/icons-material/Timer';

// MUI icons replacing emoji in SEED_SETS
import AssignmentIcon from '@mui/icons-material/Assignment';
import DirectionsBoatIcon from '@mui/icons-material/DirectionsBoat';
import FlightIcon from '@mui/icons-material/Flight';
import SecurityIcon from '@mui/icons-material/Security';
import UpgradeIcon from '@mui/icons-material/Upgrade';

import { thamSoApi } from '../../api/thamSoApiWithCache';
import type {
  LocalDynamicField as DynamicField,
  LocalFormTabConfig as FormTabConfig,
  LocalFormConfig as FormConfig,
} from '../../types/thamSo';
import { SEED_FIELDS, SEED_SETS, SEED_FORMS } from '../../data/thamSoSeeds';
import { iconToName, nameToIcon } from '../../utils/thamSoUtils';

// ============================================================
// Types
// ============================================================
type FieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';

interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  min?: number;
  max?: number;
  options?: string[];
}

// Local FieldSet uses React.ReactNode for the icon to support JSX icons in the UI
interface FieldSet {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  desc?: string;
  fieldIds: string[];
}

type LogType = 'bao_quan' | 'bao_duong' | 'sua_chua' | 'niem_cat' | 'dieu_dong' | 'gio_su_dung';
type LogTypeEntry = [LogType, { label: string; color: string; icon: React.ReactNode; fields: string[] }];

interface TechParam {
  id: string;
  key: string;
  value: string;
}

interface EquipmentLog {
  id: string;
  type: LogType;
  date: string;
  performedBy: string;
  data: Record<string, string>;
}

interface EquipmentItem {
  id: string;
  selectedSetIds: string[];
  data: Record<string, string>;
  techParams: TechParam[];
  syncEquipment: string[];
  logs: EquipmentLog[];
}


// ============================================================

const FIELD_TYPES: Array<{ value: FieldType; label: string; icon: React.ReactNode; color: string }> = [
  { value: 'text', label: 'Văn bản', icon: <TextFieldsIcon sx={{ fontSize: 14 }} />, color: '#3b82f6' },
  { value: 'number', label: 'Số', icon: <NumbersIcon sx={{ fontSize: 14 }} />, color: '#34d399' },
  { value: 'date', label: 'Ngày tháng', icon: <CalendarMonthIcon sx={{ fontSize: 14 }} />, color: '#22d3ee' },
  { value: 'select', label: 'Danh sách chọn', icon: <ListIcon sx={{ fontSize: 14 }} />, color: '#a78bfa' },
  { value: 'textarea', label: 'Văn bản dài', icon: <SubjectIcon sx={{ fontSize: 14 }} />, color: '#fbbf24' },
  { value: 'checkbox', label: 'Có / Không', icon: <CheckBoxIcon sx={{ fontSize: 14 }} />, color: '#fb923c' },
];

const typeOf = (v: string) => FIELD_TYPES.find((item) => item.value === v) ?? FIELD_TYPES[0];

const LOG_TYPES: Record<LogType, { label: string; color: string; icon: React.ReactNode; fields: string[] }> = {
  bao_quan: {
    label: 'Bảo quản',
    color: '#34d399',
    icon: <ShieldIcon fontSize="small" />,
    fields: ['noi_dung', 'don_vi_thuc_hien', 'ket_qua', 'lan_tiep_theo'],
  },
  bao_duong: {
    label: 'Bảo dưỡng',
    color: '#38bdf8',
    icon: <HandymanIcon fontSize="small" />,
    fields: ['hang_muc', 'don_vi_thuc_hien', 'chi_phi', 'ket_qua', 'lan_tiep_theo'],
  },
  sua_chua: {
    label: 'Sửa chữa',
    color: '#fbbf24',
    icon: <ConstructionIcon fontSize="small" />,
    fields: ['ly_do', 'don_vi_sua_chua', 'hang_muc', 'chi_phi', 'ket_qua'],
  },
  niem_cat: {
    label: 'Niêm cất',
    color: '#a78bfa',
    icon: <InventoryIcon fontSize="small" />,
    fields: ['vi_tri', 'don_vi_quan_ly', 'ngay_bat_dau', 'ngay_ket_thuc'],
  },
  dieu_dong: {
    label: 'Điều động',
    color: '#f472b6',
    icon: <LocalShippingIcon fontSize="small" />,
    fields: ['tu_don_vi', 'den_don_vi', 'ly_do_dd', 'so_quyet_dinh'],
  },
  gio_su_dung: {
    label: 'Giờ sử dụng',
    color: '#fb923c',
    icon: <TimerIcon fontSize="small" />,
    fields: ['so_gio', 'tu_ngay', 'den_ngay', 'nhiem_vu'],
  },
};

const LOG_LABELS: Record<string, string> = {
  noi_dung: 'Nội dung',
  don_vi_thuc_hien: 'Đơn vị thực hiện',
  ket_qua: 'Kết quả',
  lan_tiep_theo: 'Lần tiếp theo',
  hang_muc: 'Hạng mục',
  chi_phi: 'Chi phí (đ)',
  ly_do: 'Lý do',
  don_vi_sua_chua: 'Đơn vị sửa chữa',
  vi_tri: 'Vị trí niêm cất',
  don_vi_quan_ly: 'Đơn vị quản lý',
  ngay_bat_dau: 'Ngày bắt đầu',
  ngay_ket_thuc: 'Ngày kết thúc',
  tu_don_vi: 'Từ đơn vị',
  den_don_vi: 'Đến đơn vị',
  ly_do_dd: 'Lý do điều động',
  so_quyet_dinh: 'Số quyết định',
  so_gio: 'Số giờ',
  tu_ngay: 'Từ ngày',
  den_ngay: 'Đến ngày',
  nhiem_vu: 'Nhiệm vụ',
};

// SEED data imported from thamSoSeeds.tsx


const SEED_EQUIPMENT: EquipmentItem[] = []; /* [
  {
    id: 'eq01',
    selectedSetIds: ['gs01', 'gs02'],
    data: {
      ma_trang_bi: 'HQ-TB-001',
      ten_trang_bi: 'Radar trinh sát biển RLS-2M',
      don_vi_tinh: 'Bộ',
      don_vi_quan_ly: 'Lữ đoàn 146',
      cap_chat_luong: 'Loại 1',
      serial_number: 'SN-2021-0042',
      nam_san_xuat: '2018',
      nuoc_san_xuat: 'Nga',
      tinh_trang: 'Đang sử dụng',
      trong_tai: '1200',
      van_toc_tau: '28',
    },
    techParams: [
      { id: 'tp1', key: 'tan_so', value: '9.5 GHz' },
      { id: 'tp2', key: 'tam_phat_hien', value: '250 km' },
    ],
    syncEquipment: [],
    logs: [
      {
        id: 'l1',
        type: 'bao_duong',
        date: '2024-09-15',
        performedBy: 'Thiếu tá Nguyễn Văn An',
        data: { hang_muc: 'Kiểm tra ăng-ten, thay dầu', chi_phi: '4.500.000', ket_qua: 'Đạt yêu cầu' },
      },
    ],
  },
]; */

// ============================================================
// Utilities
// ============================================================
const validateFieldValue = (value: string | undefined, field: DynamicField): string | null => {
  const validation = field.validation ?? {};
  const input = String(value ?? '').trim();

  if (field.required && !input) {
    return 'Bắt buộc nhập';
  }

  if (!input) {
    return null;
  }

  if (field.type === 'text' || field.type === 'textarea') {
    if (validation.minLength !== undefined && input.length < validation.minLength) {
      return `Tối thiểu ${validation.minLength} ký tự`;
    }
    if (validation.maxLength !== undefined && input.length > validation.maxLength) {
      return `Tối đa ${validation.maxLength} ký tự`;
    }
    if (validation.pattern?.trim()) {
      try {
        if (!new RegExp(validation.pattern).test(input)) {
          return 'Không đúng định dạng';
        }
      } catch {
        return 'Regex không hợp lệ';
      }
    }
  }

  if (field.type === 'number') {
    const n = Number(input);
    if (Number.isNaN(n)) {
      return 'Phải là số';
    }
    if (validation.min !== undefined && n < validation.min) {
      return `Tối thiểu: ${validation.min}`;
    }
    if (validation.max !== undefined && n > validation.max) {
      return `Tối đa: ${validation.max}`;
    }
  }

  return null;
};

const mergeFieldsBySet = (
  selectedSetIds: string[],
  fieldSets: FieldSet[],
  fields: DynamicField[],
): DynamicField[] => {
  const mergedIds = selectedSetIds
    .flatMap((setId) => fieldSets.find((set) => set.id === setId)?.fieldIds ?? [])
    .filter((fieldId, index, arr) => arr.indexOf(fieldId) === index);

  return mergedIds
    .map((fieldId) => fields.find((field) => field.id === fieldId))
    .filter((field): field is DynamicField => Boolean(field));
};

const hasValidationRules = (field: DynamicField): boolean =>
  Object.values(field.validation ?? {}).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== '';
  });

// ============================================================
// Shared form controls
// ============================================================
interface FieldInputProps {
  field: DynamicField;
  value: string | undefined;
  error?: string;
  onChange: (key: string, value: string) => void;
}

const FieldInput: React.FC<FieldInputProps> = ({ field, value, error, onChange }) => {
  const currentValue = value ?? '';

  if (field.type === 'select') {
    return (
      <TextField
        select
        fullWidth
        size="small"
        value={currentValue}
        onChange={(event) => onChange(field.key, event.target.value)}
        error={Boolean(error)}
        helperText={error || ' '}
      >
        <MenuItem value="">
          <em>-- Chọn --</em>
        </MenuItem>
        {(field.validation.options ?? []).map((option) => (
          <MenuItem key={option} value={option}>
            {option}
          </MenuItem>
        ))}
      </TextField>
    );
  }

  if (field.type === 'textarea') {
    return (
      <TextField
        multiline
        minRows={3}
        fullWidth
        size="small"
        value={currentValue}
        onChange={(event) => onChange(field.key, event.target.value)}
        error={Boolean(error)}
        helperText={error || ' '}
      />
    );
  }

  if (field.type === 'checkbox') {
    const checked = currentValue === 'true';
    return (
      <Box sx={{ px: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={checked}
              onChange={(_, isChecked) => onChange(field.key, isChecked ? 'true' : 'false')}
            />
          }
          label={checked ? 'Có' : 'Không'}
        />
        <Typography variant="caption" color="error.main">
          {error || ' '}
        </Typography>
      </Box>
    );
  }

  return (
    <TextField
      fullWidth
      size="small"
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      value={currentValue}
      onChange={(event) => onChange(field.key, event.target.value)}
      error={Boolean(error)}
      helperText={error || ' '}
      inputProps={
        field.type === 'number'
          ? {
            min: field.validation.min,
            max: field.validation.max,
          }
          : undefined
      }
    />
  );
};

interface DynamicDataFormProps {
  fields: DynamicField[];
  data: Record<string, string>;
  errors: Record<string, string | null>;
  onChange: (key: string, value: string) => void;
}

const DynamicDataForm: React.FC<DynamicDataFormProps> = ({ fields, data, errors, onChange }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: {
        xs: '1fr',
        md: 'repeat(2, minmax(0, 1fr))',
      },
      gap: 2,
    }}
  >
    {fields.map((field) => {
      const meta = typeOf(field.type);
      const isWide = field.type === 'textarea' || field.type === 'checkbox';

      return (
        <Box key={field.id} sx={{ gridColumn: { xs: '1', md: isWide ? '1 / -1' : 'auto' } }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              {field.label}
              {field.required ? ' *' : ''}
            </Typography>
            <Chip
              size="small"
              icon={<Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5, color: meta.color }}>{meta.icon}</Box> as any}
              label={meta.label}
              sx={{
                height: 18,
                fontSize: 10,
                bgcolor: `${meta.color}22`,
                color: meta.color,
                border: `1px solid ${meta.color}55`,
              }}
            />
          </Stack>
          <FieldInput
            field={field}
            value={data[field.key]}
            error={errors[field.key] ?? undefined}
            onChange={onChange}
          />
        </Box>
      );
    })}
  </Box>
);

// ============================================================
// Field config panel
// ============================================================
interface FieldConfigPanelProps {
  field: DynamicField;
  onSave: (field: DynamicField) => void;
  onClose: () => void;
}

const FieldConfigPanel: React.FC<FieldConfigPanelProps> = ({ field, onSave, onClose }) => {
  const [draft, setDraft] = useState<DynamicField>(field);

  useEffect(() => {
    setDraft(field);
  }, [field]);

  const updateValidation = <K extends keyof FieldValidation>(key: K, value: FieldValidation[K]) => {
    setDraft((prev) => ({
      ...prev,
      validation: { ...prev.validation, [key]: value },
    }));
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" fontWeight={800} color="primary">
            Cấu hình trường
          </Typography>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack spacing={2}>
          <TextField
            label="Nhãn hiển thị"
            size="small"
            value={draft.label}
            onChange={(event) => setDraft((prev) => ({ ...prev, label: event.target.value }))}
          />

          <TextField
            label="Key"
            size="small"
            value={draft.key}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                key: event.target.value.replace(/\s+/g, '_').toLowerCase(),
              }))
            }
          />

          <TextField
            select
            label="Kiểu nhập liệu"
            size="small"
            value={draft.type}
            onChange={(event) =>
              setDraft((prev) => ({
                ...prev,
                type: event.target.value as FieldType,
                validation: prev.type === event.target.value ? prev.validation : {},
              }))
            }
          >
            {FIELD_TYPES.map((typeItem) => (
              <MenuItem key={typeItem.value} value={typeItem.value}>
                {typeItem.icon} {typeItem.label}
              </MenuItem>
            ))}
          </TextField>

          <FormControlLabel
            control={
              <Checkbox
                checked={draft.required}
                onChange={(_, checked) => setDraft((prev) => ({ ...prev, required: checked }))}
              />
            }
            label="Trường bắt buộc"
          />

          <Divider />
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Cấu hình validate
          </Typography>

          {(draft.type === 'text' || draft.type === 'textarea') && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label="Min length"
                type="number"
                size="small"
                value={draft.validation.minLength ?? ''}
                onChange={(event) =>
                  updateValidation(
                    'minLength',
                    event.target.value === '' ? undefined : Number(event.target.value),
                  )
                }
                fullWidth
              />
              <TextField
                label="Max length"
                type="number"
                size="small"
                value={draft.validation.maxLength ?? ''}
                onChange={(event) =>
                  updateValidation(
                    'maxLength',
                    event.target.value === '' ? undefined : Number(event.target.value),
                  )
                }
                fullWidth
              />
            </Stack>
          )}

          {draft.type === 'number' && (
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5}>
              <TextField
                label="Min"
                type="number"
                size="small"
                value={draft.validation.min ?? ''}
                onChange={(event) =>
                  updateValidation('min', event.target.value === '' ? undefined : Number(event.target.value))
                }
                fullWidth
              />
              <TextField
                label="Max"
                type="number"
                size="small"
                value={draft.validation.max ?? ''}
                onChange={(event) =>
                  updateValidation('max', event.target.value === '' ? undefined : Number(event.target.value))
                }
                fullWidth
              />
            </Stack>
          )}

          {draft.type === 'select' && (
            <TextField
              label="Danh sách lựa chọn (mỗi dòng 1 giá trị)"
              multiline
              minRows={4}
              size="small"
              value={(draft.validation.options ?? []).join('\n')}
              onChange={(event) =>
                updateValidation(
                  'options',
                  event.target.value
                    .split('\n')
                    .map((item) => item.trim())
                    .filter(Boolean),
                )
              }
            />
          )}

          {(draft.type === 'text' || draft.type === 'textarea') && (
            <TextField
              label="Regex pattern (tuỳ chọn)"
              size="small"
              value={draft.validation.pattern ?? ''}
              onChange={(event) => updateValidation('pattern', event.target.value)}
            />
          )}

          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={() => onSave(draft)} fullWidth>
              Lưu trường
            </Button>
            <Button variant="outlined" onClick={onClose}>
              Huỷ
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

// ============================================================
// Field set editor dialog
// ============================================================
interface FieldSetEditorDialogProps {
  open: boolean;
  setData: FieldSet;
  allFields: DynamicField[];
  onSave: (set: FieldSet) => void;
  onClose: () => void;
}

const SET_COLORS = ['#3b82f6', '#22d3ee', '#34d399', '#fbbf24', '#a78bfa', '#fb923c', '#f43f5e', '#ec4899'];

const ICON_OPTIONS: Array<{ name: string; node: React.ReactNode; label: string }> = [
  { name: 'Assignment', node: <AssignmentIcon sx={{ fontSize: 18 }} />, label: 'Assignment' },
  { name: 'Shield', node: <ShieldIcon sx={{ fontSize: 18 }} />, label: 'Bảo quản' },
  { name: 'Handyman', node: <HandymanIcon sx={{ fontSize: 18 }} />, label: 'Bảo dưỡng' },
  { name: 'Construction', node: <ConstructionIcon sx={{ fontSize: 18 }} />, label: 'Sửa chữa' },
  { name: 'Inventory', node: <InventoryIcon sx={{ fontSize: 18 }} />, label: 'Niêm cất' },
  { name: 'LocalShipping', node: <LocalShippingIcon sx={{ fontSize: 18 }} />, label: 'Điều động' },
  { name: 'Upgrade', node: <UpgradeIcon sx={{ fontSize: 18 }} />, label: 'Nâng cấp' },
  { name: 'DirectionsBoat', node: <DirectionsBoatIcon sx={{ fontSize: 18 }} />, label: 'Tàu thuyền' },
  { name: 'Flight', node: <FlightIcon sx={{ fontSize: 18 }} />, label: 'Máy bay' },
  { name: 'Security', node: <SecurityIcon sx={{ fontSize: 18 }} />, label: 'Xe tăng' },
  { name: 'LibraryBooks', node: <LibraryBooksIcon sx={{ fontSize: 18 }} />, label: 'Tài liệu' },
  { name: 'Settings', node: <SettingsIcon sx={{ fontSize: 18 }} />, label: 'Cài đặt' },
  { name: 'Build', node: <BuildIcon sx={{ fontSize: 18 }} />, label: 'Xây dựng' },
  { name: 'Timer', node: <TimerIcon sx={{ fontSize: 18 }} />, label: 'Thời gian' },
];

const FieldSetEditorDialog: React.FC<FieldSetEditorDialogProps> = ({ open, setData, allFields, onSave, onClose }) => {
  const [name, setName] = useState(setData.name);
  const [desc, setDesc] = useState(setData.desc ?? '');
  const [color, setColor] = useState(setData.color);
  const [iconName, setIconName] = useState<string>(() => {
    for (const opt of ICON_OPTIONS) {
      if (
        React.isValidElement(setData.icon) &&
        React.isValidElement(opt.node) &&
        (setData.icon as React.ReactElement).type === (opt.node as React.ReactElement).type
      ) {
        return opt.name;
      }
    }
    return 'Assignment';
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([...setData.fieldIds]);
  const [fieldSearch, setFieldSearch] = useState('');

  // Reset when dialog opens with new data
  useEffect(() => {
    setName(setData.name);
    setDesc(setData.desc ?? '');
    setColor(setData.color);
    setSelectedIds([...setData.fieldIds]);
    setFieldSearch('');
    for (const opt of ICON_OPTIONS) {
      if (
        React.isValidElement(setData.icon) &&
        React.isValidElement(opt.node) &&
        (setData.icon as React.ReactElement).type === (opt.node as React.ReactElement).type
      ) {
        setIconName(opt.name);
        return;
      }
    }
    setIconName('Assignment');
  }, [setData]);

  const filteredAllFields = useMemo(
    () => allFields.filter(
      (f) =>
        f.label.toLowerCase().includes(fieldSearch.toLowerCase()) ||
        f.key.toLowerCase().includes(fieldSearch.toLowerCase()),
    ),
    [allFields, fieldSearch],
  );

  const toggle = (fieldId: string) => {
    setSelectedIds((prev) =>
      prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId],
    );
  };

  const handleSave = () => {
    const iconNode = ICON_OPTIONS.find((o) => o.name === iconName)?.node ?? <AssignmentIcon sx={{ fontSize: 18 }} />;
    onSave({ ...setData, name: name.trim() || '(chưa đặt tên)', desc, color, icon: iconNode, fieldIds: selectedIds });
  };

  const currentIconNode = ICON_OPTIONS.find((o) => o.name === iconName)?.node ?? <AssignmentIcon sx={{ fontSize: 18 }} />;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ color, display: 'flex' }}>{currentIconNode}</Box>
          <Typography fontWeight={800}>{setData.name || 'Tạo bộ dữ liệu mới'}</Typography>
        </Stack>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 2 }}>
        <Stack spacing={2}>
          <TextField fullWidth size="small" label="Tên bộ dữ liệu" value={name}
            onChange={(e) => setName(e.target.value)} autoFocus />
          <TextField fullWidth size="small" label="Mô tả" value={desc}
            onChange={(e) => setDesc(e.target.value)} multiline rows={2} />

          {/* Color */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 0.75, display: 'block' }}>Màu sắc</Typography>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
              {SET_COLORS.map((c) => (
                <Box key={c} onClick={() => setColor(c)} sx={{
                  width: 28, height: 28, borderRadius: '50%', bgcolor: c, cursor: 'pointer',
                  border: color === c ? '3px solid' : '2px solid transparent',
                  borderColor: color === c ? 'background.paper' : 'transparent',
                  boxShadow: color === c ? `0 0 0 2px ${c}` : 'none',
                  transition: 'all 0.15s',
                }} />
              ))}
            </Stack>
          </Box>

          {/* Icon */}
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ mb: 0.75, display: 'block' }}>Icon</Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
              {ICON_OPTIONS.map((opt) => (
                <Tooltip key={opt.name} title={opt.label}>
                  <IconButton size="small" onClick={() => setIconName(opt.name)} sx={{
                    border: '1px solid',
                    borderColor: iconName === opt.name ? color : 'divider',
                    borderRadius: 1.5,
                    bgcolor: iconName === opt.name ? `${color}22` : 'transparent',
                    color: iconName === opt.name ? color : 'text.secondary',
                  }}>
                    {opt.node}
                  </IconButton>
                </Tooltip>
              ))}
            </Stack>
          </Box>

          <Divider />

          {/* Field checklist */}
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="subtitle2" fontWeight={800}>
                Chọn trường dữ liệu ({selectedIds.length}/{allFields.length})
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <Button size="small" onClick={() => setSelectedIds(allFields.map((f) => f.id))}>Chọn tất cả</Button>
                <Button size="small" onClick={() => setSelectedIds([])}>Bỏ chọn</Button>
              </Stack>
            </Stack>

            <TextField fullWidth size="small" placeholder="Tìm trường..."
              value={fieldSearch} onChange={(e) => setFieldSearch(e.target.value)} sx={{ mb: 1 }} />

            <Box sx={{ maxHeight: 300, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
              {filteredAllFields.map((field, idx) => {
                const checked = selectedIds.includes(field.id);
                const meta = typeOf(field.type);
                return (
                  <Box key={field.id} onClick={() => toggle(field.id)} sx={{
                    display: 'flex', alignItems: 'center', px: 1.5, py: 0.75,
                    cursor: 'pointer',
                    bgcolor: checked ? `${color}0d` : 'transparent',
                    borderBottom: idx < filteredAllFields.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    '&:hover': { bgcolor: checked ? `${color}1a` : 'action.hover' },
                    transition: 'background-color 0.12s',
                  }}>
                    <Checkbox size="small" checked={checked}
                      sx={{ p: 0.5, mr: 1, color: checked ? color : undefined, '&.Mui-checked': { color } }}
                      onChange={() => toggle(field.id)}
                      onClick={(e) => e.stopPropagation()} />
                    <Box sx={{ color: meta.color, display: 'flex', mr: 0.75 }}>{meta.icon}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>{field.label}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ fontFamily: 'monospace' }}>
                        {field.key} · {meta.label}
                      </Typography>
                    </Box>
                    {field.required && <Chip size="small" label="*" color="error" sx={{ height: 16, fontSize: 10, ml: 1 }} />}
                  </Box>
                );
              })}
              {filteredAllFields.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                  Không tìm thấy trường nào
                </Typography>
              )}
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Button onClick={onClose}>Huỷ</Button>
        <Button variant="contained" onClick={handleSave} disabled={!name.trim()}
          sx={{ bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(0.9)' } }}>
          Lưu ({selectedIds.length} trường)
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================
// Set selector dialog
// ============================================================
interface SetSelectorDialogProps {
  open: boolean;
  selectedSetIds: string[];
  fieldSets: FieldSet[];
  fields: DynamicField[];
  onSave: (selectedSetIds: string[]) => void;
  onClose: () => void;
}

const SetSelectorDialog: React.FC<SetSelectorDialogProps> = ({
  open,
  selectedSetIds,
  fieldSets,
  fields,
  onSave,
  onClose,
}) => {
  const [selected, setSelected] = useState<string[]>(selectedSetIds);

  useEffect(() => {
    setSelected(selectedSetIds);
  }, [selectedSetIds]);

  const mergedFields = useMemo(() => mergeFieldsBySet(selected, fieldSets, fields), [selected, fieldSets, fields]);

  const toggleSet = (setId: string) => {
    setSelected((prev) => (prev.includes(setId) ? prev.filter((id) => id !== setId) : [...prev, setId]));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography fontWeight={800}>Chọn bộ dữ liệu cho trang bị</Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          <Card variant="outlined">
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Danh sách bộ dữ liệu
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Stack spacing={1}>
                {fieldSets.map((set) => {
                  const isSelected = selected.includes(set.id);
                  return (
                    <Box
                      key={set.id}
                      sx={{
                        p: 1,
                        borderRadius: 1,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: isSelected ? `${set.color}` : 'divider',
                        bgcolor: isSelected ? `${set.color}11` : 'transparent',
                      }}
                      onClick={() => toggleSet(set.id)}
                    >
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Checkbox checked={isSelected} size="small" />
                        <Box sx={{ display: 'flex', alignItems: 'center', color: set.color }}>{set.icon}</Box>
                        <Typography>{set.name}</Typography>
                        <Chip size="small" label={`${set.fieldIds.length} trường`} />
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>

          <Card variant="outlined">
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Kết quả gộp ({mergedFields.length} trường)
              </Typography>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ maxHeight: 320, overflowY: 'auto' }}>
                {mergedFields.map((field, index) => (
                  <Stack key={field.id} direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ width: 20 }}>
                      {index + 1}
                    </Typography>
                    <Chip size="small" label={typeOf(field.type).icon} />
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {field.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {field.key}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Huỷ</Button>
        <Button variant="contained" onClick={() => onSave(selected)} disabled={selected.length === 0}>
          Áp dụng
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// ============================================================
// Equipment form
// ============================================================
interface EquipmentFormProps {
  equipment: EquipmentItem;
  fields: DynamicField[];
  fieldSets: FieldSet[];
  onChange: (next: EquipmentItem) => void;
  onSelectSets: () => void;
}

type EquipmentTab = 'info' | 'tech' | 'logs';

const EquipmentForm: React.FC<EquipmentFormProps> = ({ equipment, fields, fieldSets, onChange, onSelectSets }) => {
  const [tab, setTab] = useState<EquipmentTab>('info');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const [logType, setLogType] = useState<LogType | ''>('');
  const [logMeta, setLogMeta] = useState<{ date: string; performedBy: string }>({ date: '', performedBy: '' });
  const [logData, setLogData] = useState<Record<string, string>>({});

  useEffect(() => {
    setTouched({});
    setErrors({});
    setTab('info');
    setLogType('');
    setLogMeta({ date: '', performedBy: '' });
    setLogData({});
  }, [equipment.id]);

  const mergedFields = useMemo(
    () => mergeFieldsBySet(equipment.selectedSetIds, fieldSets, fields),
    [equipment.selectedSetIds, fieldSets, fields],
  );

  const totalErrors = mergedFields.reduce((acc, field) => (validateFieldValue(equipment.data[field.key], field) ? acc + 1 : acc), 0);

  const handleFieldChange = (key: string, value: string) => {
    onChange({ ...equipment, data: { ...equipment.data, [key]: value } });
    setTouched((prev) => ({ ...prev, [key]: true }));

    const foundField = fields.find((field) => field.key === key);
    if (foundField) {
      setErrors((prev) => ({ ...prev, [key]: validateFieldValue(value, foundField) }));
    }
  };

  const touchedErrors = Object.fromEntries(
    Object.entries(errors).filter(([key]) => touched[key]),
  ) as Record<string, string | null>;

  const setLabelById = (setId: string): React.ReactNode => {
    const found = fieldSets.find((set) => set.id === setId);
    return found ? <Stack direction="row" alignItems="center" spacing={0.5}><Box sx={{ display: 'flex', alignItems: 'center' }}>{found.icon}</Box><span>{found.name}</span></Stack> : setId;
  };

  const updateTechParams = (nextParams: TechParam[]) => {
    onChange({ ...equipment, techParams: nextParams });
  };

  const addTechParam = () => {
    updateTechParams([...equipment.techParams, { id: `tp_${Math.random().toString(36).slice(2, 9)}`, key: '', value: '' }]);
  };

  const updateTechParamField = (id: string, prop: 'key' | 'value', value: string) => {
    updateTechParams(equipment.techParams.map((param) => (param.id === id ? { ...param, [prop]: value } : param)));
  };

  const removeTechParam = (id: string) => {
    updateTechParams(equipment.techParams.filter((param) => param.id !== id));
  };

  const submitLog = () => {
    if (!logType || !logMeta.date || !logMeta.performedBy) {
      return;
    }

    const nextLog: EquipmentLog = {
      id: `log_${Math.random().toString(36).slice(2, 9)}`,
      type: logType,
      date: logMeta.date,
      performedBy: logMeta.performedBy,
      data: { ...logData },
    };

    onChange({ ...equipment, logs: [...equipment.logs, nextLog] });
    setLogType('');
    setLogMeta({ date: '', performedBy: '' });
    setLogData({});
  };

  const removeLog = (logId: string) => {
    onChange({ ...equipment, logs: equipment.logs.filter((log) => log.id !== logId) });
  };

  const sortedLogs = [...equipment.logs].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          flexWrap="wrap"
          useFlexGap
          sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Typography variant="caption" color="text.secondary" fontWeight={700}>
            Bộ dữ liệu:
          </Typography>
          {equipment.selectedSetIds.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              Chưa chọn bộ dữ liệu
            </Typography>
          )}
          {equipment.selectedSetIds.map((setId) => (
            <Chip key={setId} label={setLabelById(setId)} size="small" />
          ))}

          <Button size="small" variant="outlined" sx={{ ml: 'auto' }} onClick={onSelectSets}>
            Chọn bộ dữ liệu
          </Button>
          {totalErrors > 0 && <Chip size="small" color="error" label={`${totalErrors} lỗi`} />}
        </Stack>

        <Tabs
          value={tab}
          onChange={(_, nextTab: EquipmentTab) => setTab(nextTab)}
          sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
        >
          <Tab value="info" label="Thông tin" />
          <Tab value="tech" label="Thông số kỹ thuật" />
          <Tab value="logs" label={`Lịch sử (${equipment.logs.length})`} />
        </Tabs>

        <Box sx={{ p: 2, flex: 1, overflowY: 'auto' }}>
          {tab === 'info' && (
            <>
              {equipment.selectedSetIds.length === 0 && (
                <Box
                  sx={{
                    p: 4,
                    border: '1px dashed',
                    borderColor: 'divider',
                    borderRadius: 2,
                    textAlign: 'center',
                  }}
                >
                  <Typography color="text.secondary" mb={1}>
                    Chưa chọn bộ dữ liệu cho trang bị này
                  </Typography>
                  <Button variant="outlined" onClick={onSelectSets}>
                    Chọn bộ dữ liệu
                  </Button>
                </Box>
              )}

              {equipment.selectedSetIds.map((setId) => {
                const set = fieldSets.find((item) => item.id === setId);
                if (!set) return null;

                const setFields = set.fieldIds
                  .map((fieldId) => fields.find((field) => field.id === fieldId))
                  .filter((field): field is DynamicField => Boolean(field));

                return (
                  <Box key={set.id} mb={3}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                      <Box sx={{ display: 'flex', alignItems: 'center', color: set.color }}>{set.icon}</Box>
                      <Typography fontWeight={800} color={set.color}>
                        {set.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {setFields.length} trường
                      </Typography>
                    </Stack>

                    <DynamicDataForm
                      fields={setFields}
                      data={equipment.data}
                      errors={touchedErrors}
                      onChange={handleFieldChange}
                    />
                  </Box>
                );
              })}
            </>
          )}

          {tab === 'tech' && (
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography fontWeight={700}>Thông số kỹ thuật tự do</Typography>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={addTechParam}>
                  Thêm thông số
                </Button>
              </Stack>

              {equipment.techParams.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  Chưa có thông số.
                </Typography>
              )}

              <Stack spacing={1}>
                {equipment.techParams.map((param, index) => (
                  <Box
                    key={param.id}
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '24px 1fr 1fr 40px',
                      gap: 1,
                      alignItems: 'center',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {index + 1}
                    </Typography>
                    <TextField
                      size="small"
                      value={param.key}
                      placeholder="Tên thông số"
                      onChange={(event) => updateTechParamField(param.id, 'key', event.target.value)}
                    />
                    <TextField
                      size="small"
                      value={param.value}
                      placeholder="Giá trị"
                      onChange={(event) => updateTechParamField(param.id, 'value', event.target.value)}
                    />
                    <IconButton size="small" onClick={() => removeTechParam(param.id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          {tab === 'logs' && (
            <Box>
              {!logType && (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mb={2}>
                  {(Object.entries(LOG_TYPES) as LogTypeEntry[]).map(
                    ([type, config]) => (
                      <Button
                        key={type}
                        variant="outlined"
                        sx={{ color: config.color, borderColor: `${config.color}66` }}
                        onClick={() => setLogType(type)}
                      >
                        + {config.label}
                      </Button>
                    ),
                  )}
                </Stack>
              )}

              {logType && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                      <Stack direction="row" alignItems="center" spacing={0.75} fontWeight={800} sx={{ color: LOG_TYPES[logType].color }}>
                        {LOG_TYPES[logType].icon}
                        <Typography fontWeight={800} color={LOG_TYPES[logType].color}>{LOG_TYPES[logType].label}</Typography>
                      </Stack>
                      <IconButton size="small" onClick={() => setLogType('')}>
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Stack>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                        gap: 1.5,
                      }}
                    >
                      <TextField
                        size="small"
                        type="date"
                        label="Ngày"
                        InputLabelProps={{ shrink: true }}
                        value={logMeta.date}
                        onChange={(event) => setLogMeta((prev) => ({ ...prev, date: event.target.value }))}
                      />
                      <TextField
                        size="small"
                        label="Người thực hiện"
                        value={logMeta.performedBy}
                        onChange={(event) =>
                          setLogMeta((prev) => ({ ...prev, performedBy: event.target.value }))
                        }
                      />

                      {LOG_TYPES[logType].fields.map((fieldKey) => (
                        <TextField
                          key={fieldKey}
                          size="small"
                          label={LOG_LABELS[fieldKey] ?? fieldKey}
                          value={logData[fieldKey] ?? ''}
                          onChange={(event) =>
                            setLogData((prev) => ({ ...prev, [fieldKey]: event.target.value }))
                          }
                        />
                      ))}
                    </Box>

                    <Stack direction="row" spacing={1} mt={2}>
                      <Button variant="contained" onClick={submitLog}>
                        Lưu lịch sử
                      </Button>
                      <Button variant="outlined" onClick={() => setLogType('')}>
                        Huỷ
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              )}

              <Stack spacing={1}>
                {sortedLogs.map((log) => {
                  const config = LOG_TYPES[log.type];
                  return (
                    <Card key={log.id} variant="outlined" sx={{ borderLeft: `4px solid ${config.color}` }}>
                      <CardContent sx={{ py: 1.5 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                          <Box>
                            <Stack direction="row" alignItems="center" spacing={0.75}>
                              <Box sx={{ color: config.color, display: 'flex', alignItems: 'center' }}>{config.icon}</Box>
                              <Typography fontWeight={700}>{config.label}</Typography>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {log.date} · {log.performedBy}
                            </Typography>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap mt={1}>
                              {Object.entries(log.data)
                                .filter(([, value]) => Boolean(value))
                                .map(([fieldKey, value]) => (
                                  <Chip
                                    key={`${log.id}-${fieldKey}`}
                                    size="small"
                                    label={`${LOG_LABELS[fieldKey] ?? fieldKey}: ${value}`}
                                    variant="outlined"
                                  />
                                ))}
                            </Stack>
                          </Box>

                          <Tooltip title="Xoá lịch sử">
                            <IconButton size="small" onClick={() => removeLog(log.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// ============================================================
// Page A: Field library / field sets
// ============================================================
interface PageFieldLibraryProps {
  fields: DynamicField[];
  setFields: React.Dispatch<React.SetStateAction<DynamicField[]>>;
  fieldSets: FieldSet[];
  setFieldSets: React.Dispatch<React.SetStateAction<FieldSet[]>>;
}

const PageFieldLibrary: React.FC<PageFieldLibraryProps> = ({
  fields,
  setFields,
  fieldSets,
  setFieldSets,
}) => {
  const [search, setSearch] = useState('');
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);

  const [editingSet, setEditingSet] = useState<FieldSet | null>(null);
  const [isNewSetMode, setIsNewSetMode] = useState(false);

  const filteredFields = useMemo(
    () =>
      fields.filter(
        (field) =>
          field.label.toLowerCase().includes(search.toLowerCase()) ||
          field.key.toLowerCase().includes(search.toLowerCase()),
      ),
    [fields, search],
  );

  const editingField = editingFieldId ? fields.find((field) => field.id === editingFieldId) : undefined;

  const handleAddField = () => {
    const id = `field_${Math.random().toString(36).slice(2, 9)}`;
    const newField: DynamicField = {
      id,
      key: `truong_${fields.length + 1}`,
      label: 'Trường mới',
      type: 'text',
      required: false,
      validation: {},
    };

    setFields((prev) => [...prev, newField]);
    setEditingFieldId(id);
  };

  const handleSaveField = (nextField: DynamicField) => {
    setFields((prev) => prev.map((field) => (field.id === nextField.id ? nextField : field)));
    setEditingFieldId(null);
  };

  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((field) => field.id !== fieldId));
    setFieldSets((prev) =>
      prev.map((set) => ({
        ...set,
        fieldIds: set.fieldIds.filter((id) => id !== fieldId),
      })),
    );
    if (editingFieldId === fieldId) {
      setEditingFieldId(null);
    }
  };

  const handleCreateSet = () => {
    setIsNewSetMode(true);
    setEditingSet({
      id: `set_${Math.random().toString(36).slice(2, 9)}`,
      name: '',
      icon: <AssignmentIcon sx={{ fontSize: 18 }} />,
      color: '#3b82f6',
      desc: '',
      fieldIds: [],
    });
  };

  const handleEditSet = (set: FieldSet) => {
    setIsNewSetMode(false);
    setEditingSet(set);
  };

  const handleSaveSet = (nextSet: FieldSet) => {
    if (isNewSetMode) {
      setFieldSets((prev) => [...prev, nextSet]);
    } else {
      setFieldSets((prev) => prev.map((set) => (set.id === nextSet.id ? nextSet : set)));
    }
    setEditingSet(null);
  };

  const handleDeleteSet = (setId: string) => {
    setFieldSets((prev) => prev.filter((set) => set.id !== setId));
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1.45fr 1fr' },
        gap: 2,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ overflowY: 'auto', pr: { lg: 0.5 } }}>
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Box>
                <Typography variant="h6" fontWeight={800} color="primary">
                  Thư viện trường dữ liệu
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {fields.length} trường đã định nghĩa
                </Typography>
              </Box>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddField}>
                Thêm trường
              </Button>
            </Stack>

            <TextField
              fullWidth
              size="small"
              placeholder="Tìm theo nhãn hoặc key..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ mb: 1.5 }}
            />

            <Stack spacing={1}>
              {filteredFields.map((field, index) => {
                const active = editingFieldId === field.id;
                const fieldMeta = typeOf(field.type);
                return (
                  <Box
                    key={field.id}
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      border: '1px solid',
                      borderColor: active ? 'primary.main' : 'divider',
                      bgcolor: active ? 'action.selected' : 'background.paper',
                      cursor: 'pointer',
                    }}
                    onClick={() => setEditingFieldId(active ? null : field.id)}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="caption" color="text.secondary" sx={{ width: 20 }}>
                        {index + 1}
                      </Typography>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {field.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {field.key}
                        </Typography>
                      </Box>

                      <Chip
                        size="small"
                        icon={<Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5, color: fieldMeta.color }}>{fieldMeta.icon}</Box> as any}
                        label={fieldMeta.label}
                        sx={{
                          bgcolor: `${fieldMeta.color}22`,
                          color: fieldMeta.color,
                        }}
                      />

                      <Chip
                        size="small"
                        color={field.required ? 'error' : 'default'}
                        label={field.required ? 'Bắt buộc' : 'Tuỳ chọn'}
                        variant="outlined"
                      />

                      <Chip
                        size="small"
                        color={hasValidationRules(field) ? 'success' : 'default'}
                        label={hasValidationRules(field) ? 'Validate' : '—'}
                        variant="outlined"
                      />

                      <IconButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteField(field.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Box>
                <Typography variant="h6" fontWeight={800} color="primary">
                  Bộ dữ liệu (Field Sets)
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Nhóm trường dữ liệu để dùng khi tạo trang bị
                </Typography>
              </Box>
              <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreateSet}>
                Tạo bộ mới
              </Button>
            </Stack>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
              {fieldSets.map((set) => (
                <Card key={set.id} variant="outlined">
                  <CardContent sx={{ p: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                      <Box sx={{ display: 'flex', alignItems: 'center', color: set.color }}>{set.icon}</Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={700} noWrap>
                          {set.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {set.desc}
                        </Typography>
                      </Box>
                      <Chip size="small" label={`${set.fieldIds.length} trường`} />
                    </Stack>

                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap mb={1.25}>
                      {set.fieldIds.slice(0, 4).map((fieldId) => {
                        const field = fields.find((item) => item.id === fieldId);
                        return field ? <Chip key={fieldId} size="small" label={field.label} variant="outlined" /> : null;
                      })}
                      {set.fieldIds.length > 4 && <Chip size="small" label={`+${set.fieldIds.length - 4}`} />}
                    </Stack>

                    <Stack direction="row" spacing={1}>
                      <Button
                        fullWidth
                        size="small"
                        variant="outlined"
                        startIcon={<EditIcon fontSize="small" />}
                        onClick={() => handleEditSet(set)}
                      >
                        Sửa
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => handleDeleteSet(set.id)}
                      >
                        Xoá
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ overflowY: 'auto', pl: { lg: 0.5 } }}>
        {editingField ? (
          <FieldConfigPanel
            field={editingField}
            onSave={handleSaveField}
            onClose={() => setEditingFieldId(null)}
          />
        ) : (
          <Card sx={{ height: '100%' }}>
            <CardContent
              sx={{
                minHeight: 260,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <SettingsIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">Chọn một trường để cấu hình chi tiết</Typography>
            </CardContent>
          </Card>
        )}
      </Box>

      {editingSet && (
        <FieldSetEditorDialog
          open={Boolean(editingSet)}
          setData={editingSet}
          allFields={fields}
          onSave={handleSaveSet}
          onClose={() => setEditingSet(null)}
        />
      )}
    </Box>
  );
};

// ============================================================
// Page B: Form configuration management
// ============================================================
// Form configuration management interfaces and seed data are imported from thamSoSeeds.tsx


interface TabSetPickerDialogProps {
  open: boolean;
  tab: FormTabConfig;
  fieldSets: FieldSet[];
  fields: DynamicField[];
  onSave: (next: FormTabConfig) => void;
  onClose: () => void;
}

const TabSetPickerDialog: React.FC<TabSetPickerDialogProps> = ({ open, tab, fieldSets, fields, onSave, onClose }) => {
  const [draft, setDraft] = useState<FormTabConfig>(tab);

  useEffect(() => { setDraft(tab); }, [tab]);

  const toggle = (setId: string) =>
    setDraft((prev: FormTabConfig) => ({
      ...prev,
      setIds: prev.setIds.includes(setId)
        ? prev.setIds.filter((id: string) => id !== setId)
        : [...prev.setIds, setId],
    }));

  const selectedSets = draft.setIds
    .map((id) => fieldSets.find((s) => s.id === id))
    .filter(Boolean) as FieldSet[];

  const fieldCount = selectedSets.reduce((acc, s) => acc + s.fieldIds.length, 0);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography fontWeight={800}>Chọn bộ dữ liệu cho tab</Typography>
            <Typography variant="caption" color="text.secondary">Tab: <strong>{draft.label}</strong></Typography>
          </Box>
          <IconButton size="small" onClick={onClose}><CloseIcon fontSize="small" /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth size="small" label="Tên tab"
          value={draft.label}
          onChange={(e) => setDraft((prev) => ({ ...prev, label: e.target.value }))}
          sx={{ mb: 2 }}
        />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {/* Left: available sets */}
          <Card variant="outlined">
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>Bộ dữ liệu có sẵn</Typography>
              <Divider sx={{ my: 1 }} />
              <Stack spacing={0.75}>
                {fieldSets.map((set) => {
                  const selected = draft.setIds.includes(set.id);
                  return (
                    <Box
                      key={set.id}
                      onClick={() => toggle(set.id)}
                      sx={{
                        p: 1, borderRadius: 1, cursor: 'pointer', border: '1px solid',
                        borderColor: selected ? set.color : 'divider',
                        bgcolor: selected ? `${set.color}11` : 'transparent',
                        '&:hover': { bgcolor: selected ? `${set.color}18` : 'action.hover' },
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Checkbox checked={selected} size="small" sx={{ p: 0 }} />
                        <Box sx={{ color: set.color, display: 'flex', alignItems: 'center' }}>{set.icon}</Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{set.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{set.fieldIds.length} trường</Typography>
                        </Box>
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>

          {/* Right: selected preview */}
          <Card variant="outlined">
            <CardContent sx={{ p: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Đã chọn ({selectedSets.length} bộ • {fieldCount} trường)
              </Typography>
              <Divider sx={{ my: 1 }} />
              {selectedSets.length === 0 && (
                <Typography variant="body2" color="text.disabled">Chưa chọn bộ nào.</Typography>
              )}
              <Stack spacing={0.5}>
                {selectedSets.map((set) => (
                  <Box key={set.id} sx={{ p: 0.75, borderRadius: 1, border: `1px solid ${set.color}44`, bgcolor: `${set.color}0A` }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ color: set.color, display: 'flex', alignItems: 'center' }}>{set.icon}</Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={600}>{set.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {set.fieldIds.map((fid) => fields.find((f) => f.id === fid)?.label).filter(Boolean).slice(0, 3).join(', ')}
                          {set.fieldIds.length > 3 ? ` +${set.fieldIds.length - 3}` : ''}
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Huỷ</Button>
        <Button variant="contained" onClick={() => onSave(draft)} disabled={draft.setIds.length === 0}>
          Xác nhận
        </Button>
      </DialogActions>
    </Dialog>
  );
};

interface PageFormConfigProps {
  fieldSets: FieldSet[];
  fields: DynamicField[];
  forms: FormConfig[];
  setForms: React.Dispatch<React.SetStateAction<FormConfig[]>>;
  activeFormId: string | null;
  setActiveFormId: (id: string | null) => void;
}

const PageFormConfig: React.FC<PageFormConfigProps> = ({ fieldSets, fields, forms, setForms, activeFormId, setActiveFormId }) => {
  const [editingTab, setEditingTab] = useState<FormTabConfig | null>(null);

  const activeForm = forms.find((f) => f.id === activeFormId) ?? null;

  const updateActiveForm = (next: FormConfig) =>
    setForms((prev) => prev.map((f) => (f.id === next.id ? next : f)));

  const createForm = () => {
    const id = `form_${Math.random().toString(36).slice(2, 9)}`;
    const newForm: FormConfig = {
      id,
      name: 'Form mới',
      desc: '',
      tabs: [{ id: `tab_${Math.random().toString(36).slice(2, 9)}`, label: 'Tab 1', setIds: [] }],
    };
    setForms((prev) => [...prev, newForm]);
    setActiveFormId(id);
  };

  const deleteForm = (formId: string) => {
    const next = forms.filter((f) => f.id !== formId);
    setForms(next);
    setActiveFormId(next[0]?.id ?? null);
  };

  const addTab = () => {
    if (!activeForm) return;
    const newTab: FormTabConfig = { id: `tab_${Math.random().toString(36).slice(2, 9)}`, label: `Tab ${activeForm.tabs.length + 1}`, setIds: [] };
    updateActiveForm({ ...activeForm, tabs: [...activeForm.tabs, newTab] });
  };

  const removeTab = (tabId: string) => {
    if (!activeForm) return;
    updateActiveForm({ ...activeForm, tabs: activeForm.tabs.filter((t) => t.id !== tabId) });
  };

  const saveTab = (next: FormTabConfig) => {
    if (!activeForm) return;
    updateActiveForm({ ...activeForm, tabs: activeForm.tabs.map((t) => (t.id === next.id ? next : t)) });
    setEditingTab(null);
  };

  const moveTab = (index: number, dir: -1 | 1) => {
    if (!activeForm) return;
    const ni = index + dir;
    if (ni < 0 || ni >= activeForm.tabs.length) return;
    const next = [...activeForm.tabs];
    [next[index], next[ni]] = [next[ni], next[index]];
    updateActiveForm({ ...activeForm, tabs: next });
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '280px 1fr' }, gap: 2, height: '100%', overflow: 'hidden' }}>

      {/* Left: form list */}
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={createForm}>
            Tạo form mới
          </Button>
        </CardContent>
        <Box sx={{ p: 1, overflowY: 'auto', flex: 1 }}>
          <Stack spacing={0.75}>
            {forms.map((form: FormConfig) => {
              const isActive = form.id === activeFormId;
              const totalSets = form.tabs.reduce((a: number, t: FormTabConfig) => a + t.setIds.length, 0);
              return (
                <Box
                  key={form.id}
                  onClick={() => setActiveFormId(form.id)}
                  sx={{
                    p: 1.5, borderRadius: 1.5, cursor: 'pointer', border: '1px solid',
                    borderColor: isActive ? 'primary.main' : 'divider',
                    bgcolor: isActive ? 'action.selected' : 'background.paper',
                    '&:hover': { bgcolor: isActive ? 'action.selected' : 'action.hover' },
                  }}
                >
                  <Typography variant="body2" fontWeight={700} noWrap>{form.name}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>{form.desc}</Typography>
                  <Stack direction="row" spacing={0.75} mt={0.75}>
                    <Chip size="small" icon={<LibraryBooksIcon sx={{ fontSize: 12 }} />} label={`${form.tabs.length} tab`} />
                    <Chip size="small" label={`${totalSets} bộ dữ liệu`} variant="outlined" />
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Card>

      {/* Right: form editor */}
      {activeForm ? (
        <Card sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Form header */}
          <CardContent sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
              <Box sx={{ flex: 1 }}>
                <TextField
                  fullWidth size="small" label="Tên form"
                  value={activeForm.name}
                  onChange={(e) => updateActiveForm({ ...activeForm, name: e.target.value })}
                  sx={{ mb: 1 }}
                />
                <TextField
                  fullWidth size="small" label="Mô tả"
                  value={activeForm.desc ?? ''}
                  onChange={(e) => updateActiveForm({ ...activeForm, desc: e.target.value })}
                />
              </Box>
              <Stack direction="row" spacing={1} alignSelf={{ xs: 'flex-start', sm: 'flex-end' }}>
                <Chip
                  size="small" color="primary" variant="outlined"
                  icon={<LibraryBooksIcon sx={{ fontSize: 14 }} />}
                  label={`${activeForm.tabs.length} tab`}
                />
                <Button color="error" variant="outlined" size="small" startIcon={<DeleteIcon />}
                  onClick={() => deleteForm(activeForm.id)}>
                  Xoá form
                </Button>
              </Stack>
            </Stack>
          </CardContent>

          {/* Tab list editor */}
          <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', color: 'text.secondary' }}>
                Cấu hình tab ({activeForm.tabs.length})
              </Typography>
              <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addTab}>
                Thêm tab
              </Button>
            </Stack>

            {activeForm.tabs.length === 0 && (
              <Box sx={{ p: 4, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                <LibraryBooksIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary" mb={1}>Form chưa có tab nào.</Typography>
                <Button variant="outlined" startIcon={<AddIcon />} onClick={addTab}>Thêm tab đầu tiên</Button>
              </Box>
            )}

            <Stack spacing={1.5}>
              {activeForm.tabs.map((tab: FormTabConfig, idx: number) => {
                const selectedSets = tab.setIds
                  .map((id: string) => fieldSets.find((s: FieldSet) => s.id === id))
                  .filter(Boolean) as FieldSet[];
                const totalFields = selectedSets.reduce((a: number, s: FieldSet) => a + s.fieldIds.length, 0);

                return (
                  <Card
                    key={tab.id}
                    variant="outlined"
                    sx={{ borderRadius: 2, borderColor: 'divider', '&:hover': { boxShadow: 2 }, transition: 'box-shadow 0.2s' }}
                  >
                    <CardContent sx={{ p: 1.5 }}>
                      <Stack direction="row" alignItems="flex-start" spacing={1}>
                        {/* Reorder */}
                        <Stack direction="column" spacing={0.25}>
                          <IconButton size="small" onClick={() => moveTab(idx, -1)} disabled={idx === 0}>
                            <ArrowUpwardIcon fontSize="inherit" />
                          </IconButton>
                          <IconButton size="small" onClick={() => moveTab(idx, 1)} disabled={idx === activeForm.tabs.length - 1}>
                            <ArrowDownwardIcon fontSize="inherit" />
                          </IconButton>
                        </Stack>

                        {/* Content */}
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                            <Chip
                              size="small"
                              label={`Tab ${idx + 1}`}
                              sx={{ fontWeight: 700, fontFamily: 'monospace', bgcolor: 'action.selected' }}
                            />
                            <Typography variant="body1" fontWeight={700}>{tab.label}</Typography>
                            <Chip size="small" label={`${selectedSets.length} bộ • ${totalFields} trường`} variant="outlined" />
                          </Stack>

                          {/* Selected sets display */}
                          {selectedSets.length === 0 ? (
                            <Typography variant="caption" color="text.disabled">Chưa chọn bộ dữ liệu nào.</Typography>
                          ) : (
                            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                              {selectedSets.map((set: FieldSet) => (
                                <Chip
                                  key={set.id} size="small"
                                  icon={<Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5, color: set.color }}>{set.icon}</Box> as any}
                                  label={set.name}
                                  sx={{ border: `1px solid ${set.color}55`, bgcolor: `${set.color}11`, color: set.color }}
                                />
                              ))}
                            </Stack>
                          )}
                        </Box>

                        {/* Actions */}
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Cấu hình tab">
                            <IconButton size="small" onClick={() => setEditingTab(tab)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Xóa tab">
                            <IconButton size="small" color="error" onClick={() => removeTab(tab.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>

            {/* Live structure preview */}
            {activeForm.tabs.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" fontWeight={800} mb={1.5} color="text.secondary"
                  sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                  Xem trước cấu trúc form
                </Typography>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ p: 0 }}>
                    {/* Mock tab header */}
                    <Box sx={{ display: 'flex', borderBottom: '1px solid', borderColor: 'divider', overflowX: 'auto' }}>
                      {activeForm.tabs.map((tab: FormTabConfig, i: number) => (
                        <Box
                          key={tab.id}
                          sx={{
                            px: 2, py: 1, borderRight: '1px solid', borderColor: 'divider',
                            bgcolor: i === 0 ? 'action.selected' : 'transparent',
                            fontWeight: i === 0 ? 700 : 400,
                            fontSize: '0.8rem', whiteSpace: 'nowrap', color: i === 0 ? 'primary.main' : 'text.secondary',
                          }}
                        >
                          {tab.label}
                        </Box>
                      ))}
                    </Box>
                    {/* First tab fields preview */}
                    <Box sx={{ p: 2 }}>
                      <Typography variant="caption" color="text.secondary" mb={1} display="block">
                        Nội dung tab “{activeForm.tabs[0]?.label}”:
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }, gap: 1 }}>
                        {activeForm.tabs[0]?.setIds
                          .flatMap((sid: string) => {
                            const set = fieldSets.find((s: FieldSet) => s.id === sid);
                            return (set?.fieldIds ?? []).map((fid: string) => fields.find((f: DynamicField) => f.id === fid)).filter(Boolean) as DynamicField[];
                          })
                          .map((field: DynamicField) => (
                            <Box key={field.id} sx={{ p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                              <Typography variant="caption" fontWeight={600} noWrap>{field.label}</Typography>
                              <Typography variant="caption" color="text.secondary" display="block" noWrap sx={{ fontFamily: 'monospace' }}>{field.type}</Typography>
                            </Box>
                          ))
                        }
                      </Box>
                      {activeForm.tabs[0]?.setIds.length === 0 && (
                        <Typography variant="caption" color="text.disabled">Tab chưa có bộ dữ liệu.</Typography>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </Card>
      ) : (
        <Card sx={{ height: '100%' }}>
          <CardContent sx={{ minHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <BuildIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
            <Typography color="text.secondary" mb={1}>Chọn một form hoặc tạo mới</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={createForm}>Tạo form mới</Button>
          </CardContent>
        </Card>
      )}

      {editingTab && activeForm && (
        <TabSetPickerDialog
          open={Boolean(editingTab)}
          tab={editingTab}
          fieldSets={fieldSets}
          fields={fields}
          onSave={saveTab}
          onClose={() => setEditingTab(null)}
        />
      )}
    </Box>
  );
};

// ============================================================
// Page C: Dedicated dataset / field-set management
// ============================================================
interface PageDatasetsProps {
  fields: DynamicField[];
  fieldSets: FieldSet[];
  setFieldSets: React.Dispatch<React.SetStateAction<FieldSet[]>>;
  activeSetId: string | null;
  setActiveSetId: (id: string | null) => void;
}

const PageDatasets: React.FC<PageDatasetsProps> = ({ fields, fieldSets, setFieldSets, activeSetId, setActiveSetId }) => {
  const [search, setSearch] = useState('');
  const [editingSet, setEditingSet] = useState<FieldSet | null>(null);
  const [isNewMode, setIsNewMode] = useState(false);

  const activeSet = fieldSets.find((s) => s.id === activeSetId) ?? null;

  const filteredSets = useMemo(
    () => fieldSets.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())),
    [fieldSets, search],
  );

  const activeFields = useMemo(
    () =>
      (activeSet?.fieldIds ?? [])
        .map((fid) => fields.find((f) => f.id === fid))
        .filter((f): f is DynamicField => Boolean(f)),
    [activeSet, fields],
  );

  const handleCreate = () => {
    setIsNewMode(true);
    setEditingSet({
      id: `set_${Math.random().toString(36).slice(2, 9)}`,
      name: '',
      icon: <AssignmentIcon sx={{ fontSize: 18 }} />,
      color: '#3b82f6',
      desc: '',
      fieldIds: [],
    });
  };

  const handleSave = (next: FieldSet) => {
    if (isNewMode) {
      setFieldSets((prev) => [...prev, next]);
      setActiveSetId(next.id);
    } else {
      setFieldSets((prev) => prev.map((s) => (s.id === next.id ? next : s)));
    }
    setEditingSet(null);
  };

  const handleDelete = (setId: string) => {
    const next = fieldSets.filter((s) => s.id !== setId);
    setFieldSets(next);
    setActiveSetId(next[0]?.id ?? null);
  };

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '320px 1fr' },
        gap: 2,
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Left: set list */}
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <TextField
            fullWidth size="small"
            placeholder="Tìm bộ dữ liệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ mb: 1 }}
          />
          <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Tạo bộ dữ liệu mới
          </Button>
        </CardContent>

        <Box sx={{ p: 1, overflowY: 'auto', flex: 1 }}>
          <Stack spacing={0.75}>
            {filteredSets.map((set) => {
              const isActive = set.id === activeSetId;
              return (
                <Box
                  key={set.id}
                  onClick={() => setActiveSetId(set.id)}
                  sx={{
                    p: 1.25, borderRadius: 1.5, cursor: 'pointer',
                    border: '1px solid',
                    borderColor: isActive ? 'primary.main' : 'divider',
                    bgcolor: isActive ? 'action.selected' : 'background.paper',
                    '&:hover': { bgcolor: isActive ? 'action.selected' : 'action.hover' },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ color: set.color, display: 'flex', alignItems: 'center' }}>{set.icon}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>{set.name}</Typography>
                      <Typography variant="caption" color="text.secondary" noWrap>{set.desc}</Typography>
                    </Box>
                    <Chip size="small" label={`${set.fieldIds.length}`} sx={{ bgcolor: `${set.color}22`, color: set.color, fontWeight: 700 }} />
                  </Stack>
                </Box>
              );
            })}
            {filteredSets.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>Không tìm thấy bộ nào.</Typography>
            )}
          </Stack>
        </Box>
      </Card>

      {/* Right: preview + actions */}
      {activeSet ? (
        <Card sx={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <CardContent sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
              <Box sx={{ color: activeSet.color, display: 'flex', alignItems: 'center', fontSize: 28 }}>{activeSet.icon}</Box>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={800} color={activeSet.color}>{activeSet.name}</Typography>
                <Typography variant="body2" color="text.secondary">{activeSet.desc}</Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined" size="small"
                  startIcon={<EditIcon />}
                  onClick={() => { setIsNewMode(false); setEditingSet(activeSet); }}
                >
                  Chỉnh sửa
                </Button>
                <Button
                  variant="outlined" size="small" color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleDelete(activeSet.id)}
                >
                  Xoá
                </Button>
              </Stack>
            </Stack>
            <Stack direction="row" spacing={1} mt={1}>
              <Chip size="small" icon={<LibraryBooksIcon sx={{ fontSize: 14 }} />} label={`${activeFields.length} trường`} color="primary" variant="outlined" />
              <Box
                sx={{
                  width: 16, height: 16, borderRadius: '50%',
                  bgcolor: activeSet.color, border: '2px solid',
                  borderColor: 'background.paper',
                  boxShadow: `0 0 0 1px ${activeSet.color}`,
                }}
              />
            </Stack>
          </CardContent>

          <Box sx={{ p: 2, overflowY: 'auto', flex: 1 }}>
            <Typography
              variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary"
              sx={{ textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}
            >
              Danh sách trường trong bộ ({activeFields.length})
            </Typography>

            {activeFields.length === 0 && (
              <Box sx={{ p: 3, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
                <Typography color="text.secondary">Bộ dữ liệu này chưa có trường nào.</Typography>
                <Button variant="outlined" sx={{ mt: 1 }} onClick={() => { setIsNewMode(false); setEditingSet(activeSet); }}>
                  Thêm trường ngay
                </Button>
              </Box>
            )}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', xl: '1fr 1fr 1fr' }, gap: 1.5 }}>
              {activeFields.map((field, idx) => {
                const meta = typeOf(field.type);
                return (
                  <Card key={field.id} variant="outlined" sx={{ border: `1px solid ${meta.color}44`, borderRadius: 1.5 }}>
                    <CardContent sx={{ p: 1.5 }}>
                      <Stack direction="row" alignItems="flex-start" spacing={1}>
                        <Box sx={{ p: 0.75, borderRadius: 1, bgcolor: `${meta.color}18`, color: meta.color, display: 'flex', mt: 0.25 }}>{meta.icon}</Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" alignItems="center" spacing={0.75} mb={0.25}>
                            <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>{idx + 1}</Typography>
                            <Typography variant="body2" fontWeight={700} noWrap>{field.label}</Typography>
                            {field.required && <Chip size="small" label="*" color="error" sx={{ height: 16, fontSize: 10 }} />}
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', display: 'block' }} noWrap>
                            key: {field.key}
                          </Typography>
                          <Chip
                            size="small" label={meta.label}
                            sx={{ mt: 0.5, height: 18, fontSize: 10, bgcolor: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}44` }}
                          />
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Box>
        </Card>
      ) : (
        <Card sx={{ height: '100%' }}>
          <CardContent sx={{ minHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
            <SettingsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
            <Typography color="text.secondary" mb={1}>Chọn một bộ dữ liệu hoặc tạo mới</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={handleCreate}>Tạo bộ dữ liệu mới</Button>
          </CardContent>
        </Card>
      )}

      {editingSet && (
        <FieldSetEditorDialog
          open={Boolean(editingSet)}
          setData={editingSet}
          allFields={fields}
          onSave={handleSave}
          onClose={() => setEditingSet(null)}
        />
      )}
    </Box>
  );
};

// ============================================================
// Icon utilities (nameToIcon, iconToName) are imported from thamSoUtils.tsx


// ============================================================
// Root page
// ============================================================
type MainTab = 'fields' | 'datasets' | 'equip';

const CauHinhThamSo: React.FC = () => {
  const [tab, setTab] = useState<MainTab>('fields');
  const [fields, setFields] = useState<DynamicField[]>([]); // (SEED_FIELDS)
  const [fieldSets, setFieldSets] = useState<FieldSet[]>([]); // (SEED_SETS)
  const [activeSetId, setActiveSetId] = useState<string | null>(null); // (SEED_SETS[0]?.id ?? null)
  const [forms, setForms] = useState<FormConfig[]>([]); // (SEED_FORMS)
  const [activeFormId, setActiveFormId] = useState<string | null>(null); // (SEED_FORMS[0]?.id ?? null)
  const [loading, setLoading] = useState(true);
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false, message: '', severity: 'info',
  });

  // Load data from API on mount
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const [apiFields, apiSets, apiForms] = await Promise.all([
          thamSoApi.getListDynamicFields().catch(() => []),
          thamSoApi.getListFieldSets().catch(() => []),
          thamSoApi.getListFormConfigs().catch(() => []),
        ]);

        if (cancelled) return;

        // If DB is empty or disconnected, seed with defaults
        // If DB is empty or disconnected, only use API data
        const finalFields = apiFields; // apiFields.length > 0 ? apiFields : SEED_FIELDS;
        const finalSets = (apiSets).map((s: any) => ({ // (apiSets.length > 0 ? apiSets : SEED_SETS)
          ...s,
          icon: typeof s.icon === 'string' ? nameToIcon(s.icon) : s.icon
        }));
        const finalForms = apiForms; // apiForms.length > 0 ? apiForms : SEED_FORMS;

        setFields(finalFields as any);
        setFieldSets(finalSets as any);
        setForms(finalForms as any);

        if (finalSets.length > 0) setActiveSetId(finalSets[0].id);
        if (finalForms.length > 0) setActiveFormId(finalForms[0].id);

        setSnack({ open: true, message: `Đã cập nhật cấu hình: ${finalFields.length} trường, ${finalSets.length} bộ dữ liệu`, severity: 'success' });
      } catch (err) {
        console.error('[CauHinhThamSo] Failed to load from API', err);
        setSnack({ open: true, message: 'Lỗi tải cấu hình từ server', severity: 'error' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();
    return () => { cancelled = true; };
  }, []);

  // ── Persist helpers ──
  const handleSaveField = async (field: DynamicField, isNew: boolean) => {
    try {
      const response = await thamSoApi.saveDynamicField(field as any, isNew);

      if (response && isNew) {
        // Cập nhật lại ID thật từ Backend (ObjectId) vào State
        setFields(prev => prev.map(f => f.id === field.id ? { ...f, id: response.id } : f));
      }

      setSnack({ open: true, message: `Đã lưu trường "${field.label}"`, severity: 'success' });
    } catch (err) {
      console.error('[CauHinhThamSo] saveDynamicField error', err);
      setSnack({ open: true, message: 'Lỗi lưu trường dữ liệu', severity: 'error' });
    }
  };

  const handleDeleteField = async (id: string) => {
    try {
      await thamSoApi.deleteDynamicField(id);
      setSnack({ open: true, message: 'Đã xoá trường', severity: 'success' });
    } catch (err) {
      console.error('[CauHinhThamSo] deleteDynamicField error', err);
      setSnack({ open: true, message: 'Lỗi xoá trường dữ liệu', severity: 'error' });
    }
  };

  const handleSaveFieldSet = async (fieldSet: FieldSet, isNew: boolean) => {
    try {
      const response = await thamSoApi.saveFieldSet({
        ...fieldSet,
        icon: iconToName(fieldSet.icon),
        desc: fieldSet.desc ?? '',
      } as any, isNew);

      if (response && isNew) {
        // Cập nhật lại ID thật từ Backend vào State và activeSet
        const newItem: FieldSet = {
          ...fieldSet,
          id: response.id,
          icon: fieldSet.icon // Keep local JSX icon
        };
        setFieldSets(prev => prev.map(s => s.id === fieldSet.id ? newItem : s));
        setActiveSetId(newItem.id);
      }

      setSnack({ open: true, message: `Đã lưu bộ dữ liệu "${fieldSet.name}"`, severity: 'success' });
    } catch (err) {
      console.error('[CauHinhThamSo] saveFieldSet error', err);
      setSnack({ open: true, message: 'Lỗi lưu bộ dữ liệu', severity: 'error' });
    }
  };

  const handleDeleteFieldSet = async (id: string) => {
    try {
      await thamSoApi.deleteFieldSet(id);
      setSnack({ open: true, message: 'Đã xoá bộ dữ liệu', severity: 'success' });
    } catch (err) {
      console.error('[CauHinhThamSo] deleteFieldSet error', err);
      setSnack({ open: true, message: 'Lỗi xoá bộ dữ liệu', severity: 'error' });
    }
  };

  const handleSaveFormConfig = async (form: FormConfig, isNew: boolean) => {
    try {
      const response = await thamSoApi.saveFormConfig(form as any, isNew);
      if (response && isNew) {
        setForms(prev => prev.map(f => f.id === form.id ? response : f));
        setActiveFormId(response.id);
      }
      setSnack({ open: true, message: `Đã lưu cấu hình form "${form.name}"`, severity: 'success' });
    } catch (err) {
      console.error('[CauHinhThamSo] saveFormConfig error', err);
      setSnack({ open: true, message: 'Lỗi lưu cấu hình form', severity: 'error' });
    }
  };

  const handleDeleteFormConfig = async (id: string) => {
    try {
      await thamSoApi.deleteFormConfig(id);
      setSnack({ open: true, message: 'Đã xoá cấu hình form', severity: 'success' });
    } catch (err) {
      console.error('[CauHinhThamSo] deleteFormConfig error', err);
      setSnack({ open: true, message: 'Lỗi xoá cấu hình form', severity: 'error' });
    }
  };

  // Wrap setFields / setFieldSets so they also persist
  const setFieldsAndPersist: React.Dispatch<React.SetStateAction<DynamicField[]>> = (action) => {
    setFields((prev: DynamicField[]) => {
      const next = typeof action === 'function' ? action(prev) : action;
      // Detect added or changed items and persist them
      for (const f of next) {
        const existing = prev.find((p: DynamicField) => p.id === f.id);
        if (!existing) {
          handleSaveField(f, true);
        } else if (JSON.stringify(existing) !== JSON.stringify(f)) {
          handleSaveField(f, false);
        }
      }
      // Detect deleted
      for (const p of prev) {
        if (!next.find((f: DynamicField) => f.id === p.id)) {
          handleDeleteField(p.id);
        }
      }
      return next;
    });
  };

  const setFormsAndPersist: React.Dispatch<React.SetStateAction<FormConfig[]>> = (action) => {
    setForms((prev: FormConfig[]) => {
      const next = typeof action === 'function' ? action(prev) : action;
      for (const f of next) {
        const existing = prev.find((p: FormConfig) => p.id === f.id);
        if (!existing) {
          handleSaveFormConfig(f, true);
        } else if (JSON.stringify(existing) !== JSON.stringify(f)) {
          handleSaveFormConfig(f, false);
        }
      }
      for (const p of prev) {
        if (!next.find((f: FormConfig) => f.id === p.id)) {
          handleDeleteFormConfig(p.id);
        }
      }
      return next;
    });
  };

  const setFieldSetsAndPersist: React.Dispatch<React.SetStateAction<FieldSet[]>> = (action) => {
    setFieldSets((prev: FieldSet[]) => {
      const next = typeof action === 'function' ? action(prev) : action;
      for (const s of next) {
        const existing = prev.find((p: FieldSet) => p.id === s.id);
        if (!existing) {
          handleSaveFieldSet(s, true);
        } else if (
          existing && (
            existing.name !== s.name ||
            existing.color !== s.color ||
            existing.desc !== s.desc ||
            JSON.stringify(existing.fieldIds) !== JSON.stringify(s.fieldIds)
          )
        ) {
          handleSaveFieldSet(s, false);
        }
      }
      for (const p of prev) {
        if (!next.find((s: FieldSet) => s.id === p.id)) {
          handleDeleteFieldSet(p.id);
        }
      }
      return next;
    });
  };

  return (
    <Box sx={{ p: 1.5 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
            CẤU HÌNH THAM SỐ NHẬP LIỆU
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cấu hình động trường dữ liệu, bộ dữ liệu và biểu mẫu trang bị — kết nối MongoDB qua gRPC
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Chip icon={<LibraryBooksIcon />} label={`${fields.length} trường`} color="primary" variant="outlined" />
          <Chip icon={<SettingsIcon />} label={`${fieldSets.length} bộ`} color="secondary" variant="outlined" />
          {loading && <Chip label="Đang tải..." variant="outlined" />}
        </Stack>
      </Stack>

      <Card sx={{ mb: 1.5 }}>
        <CardContent sx={{ p: 1 }}>
          <Tabs
            value={tab}
            onChange={(_, nextTab: MainTab) => setTab(nextTab)}
            sx={{
              '& .MuiTab-root': {
                fontWeight: 700,
                textTransform: 'none',
                minHeight: 38,
              },
            }}
          >
            <Tab value="fields" icon={<LibraryBooksIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Quản lý trường dữ liệu" />
            <Tab value="datasets" icon={<SettingsIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Quản lý bộ dữ liệu nhập" />
            <Tab value="equip" icon={<BuildIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Quản lý form nhập" />
          </Tabs>
        </CardContent>
      </Card>

      <Box
        sx={{
          height: {
            xs: 'auto',
            md: 'calc(100vh - 300px)',
          },
          minHeight: 560,
        }}
      >
        {tab === 'fields' && (
          <PageFieldLibrary
            fields={fields}
            setFields={setFieldsAndPersist}
            fieldSets={fieldSets}
            setFieldSets={setFieldSetsAndPersist}
          />
        )}
        {tab === 'datasets' && (
          <PageDatasets
            fields={fields}
            fieldSets={fieldSets}
            setFieldSets={setFieldSetsAndPersist}
            activeSetId={activeSetId}
            setActiveSetId={setActiveSetId}
          />
        )}
        {tab === 'equip' && (
          <PageFormConfig
            fields={fields}
            fieldSets={fieldSets}
            forms={forms}
            setForms={setFormsAndPersist}
            activeFormId={activeFormId}
            setActiveFormId={setActiveFormId}
          />
        )}
      </Box>

      {/* Snackbar notifications */}
      {snack.open && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            minWidth: 300,
            bgcolor: snack.severity === 'success' ? '#2e7d32' : snack.severity === 'error' ? '#d32f2f' : '#0288d1',
            color: '#fff',
            borderRadius: 2,
            px: 2.5,
            py: 1.5,
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <Typography variant="body2" fontWeight={600}>{snack.message}</Typography>
          <IconButton size="small" sx={{ color: '#fff', ml: 1 }} onClick={() => setSnack((s) => ({ ...s, open: false }))}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};

export default CauHinhThamSo;
