// ============================================================
// TrangBiLog types — frontend mirror of TrangBiLog.proto
// ============================================================
import type { Timestamp } from '@bufbuild/protobuf/wkt';

// ── Enums (mirrors proto) ──────────────────────────────────
export type LogType = 0 | 1 | 2 | 3 | 4 | 5;
export const LogType = {
  Unspecified: 0 as const,
  BaoQuan: 1 as const,
  BaoDuong: 2 as const,
  SuaChua: 3 as const,
  NiemCat: 4 as const,
  DieuDong: 5 as const,
};
export const LOG_TYPE_LABELS: Record<LogType, string> = {
  [LogType.Unspecified]: 'Không xác định',
  [LogType.BaoQuan]: 'Bảo quản',
  [LogType.BaoDuong]: 'Bảo dưỡng',
  [LogType.SuaChua]: 'Sửa chữa',
  [LogType.NiemCat]: 'Niêm cất',
  [LogType.DieuDong]: 'Điều động',
};

export type CapBaoDuong = 0 | 1 | 2 | 3 | 4;
export const CAP_BD_LABELS: Record<CapBaoDuong, string> = {
  [0]: 'Không xác định',
  [1]: 'Cấp 1 — thường xuyên',
  [2]: 'Cấp 2 — định kỳ',
  [3]: 'Cấp 3 — trung tu',
  [4]: 'Cấp 4 — đại tu',
};

export type LogStatus = 0 | 1 | 2 | 3 | 4;
export const LOG_STATUS_LABELS: Record<LogStatus, string> = {
  [0]: 'Không xác định',
  [1]: 'Đã hoàn thành',
  [2]: 'Đang thực hiện',
  [3]: 'Chưa thực hiện',
  [4]: 'Hủy',
};
export const LOG_STATUS_COLORS: Record<LogStatus, 'success' | 'warning' | 'error' | 'default'> = {
  [0]: 'default',
  [1]: 'success',
  [2]: 'warning',
  [3]: 'default',
  [4]: 'error',
};

export type ChecklistResult = 0 | 1 | 2 | 3;
export const CHECKLIST_RESULT_LABELS: Record<ChecklistResult, string> = {
  [0]: 'Chưa kiểm tra',
  [1]: 'Đạt',
  [2]: 'Cần theo dõi',
  [3]: 'Không đạt',
};
export const CHECKLIST_RESULT_COLORS: Record<ChecklistResult, 'success' | 'warning' | 'error'> = {
  [0]: 'warning',
  [1]: 'success',
  [2]: 'warning',
  [3]: 'error',
};

export type MucDoSuaChua = 0 | 1 | 2 | 3 | 4;
export const MUC_DO_SC_LABELS: Record<MucDoSuaChua, string> = {
  [0]: 'Không xác định',
  [1]: 'Sửa chữa cấp 1 — đơn giản',
  [2]: 'Sửa chữa cấp 2 — trung bình',
  [3]: 'Sửa chữa cấp 3 — phức tạp',
  [4]: 'Sửa chữa cấp 4 — đặc biệt',
};

export type NiemCatStatus = 0 | 1 | 2 | 3 | 4;
export const NIEM_CAT_STATUS_LABELS: Record<NiemCatStatus, string> = {
  [0]: 'Không xác định',
  [1]: 'Đã đóng gói',
  [2]: 'Chưa đóng gói',
  [3]: 'Đã mở',
  [4]: 'Hủy bỏ',
};

export type LoaiDieuDong = 0 | 1 | 2 | 3 | 4;
export const LOAI_DIEU_DONG_LABELS: Record<LoaiDieuDong, string> = {
  [0]: 'Không xác định',
  [1]: 'Điều động nội bộ',
  [2]: 'Chuyển chuyên ngành',
  [3]: 'Đơn vị bàn giao',
  [4]: 'Đơn vị nhận',
};

// ── Checklist ──────────────────────────────────────────────
export interface ChecklistItem {
  id: string;
  fieldId: string;
  label: string;
  isChecked: boolean;
  result: ChecklistResult;
  note?: string;
}

// ── Parts ──────────────────────────────────────────────────
export interface PhuTungThayThe {
  id: string;
  tenPhuTung: string;
  maPhuTung: string;
  soLuong: number;
  nguonCap: string;
  ghiChu?: string;
}

// ── Signature ─────────────────────────────────────────────
export interface SignatureBlock {
  role: string;
  signedBy?: string;
  signedAt?: string;
}

// ── Type-specific fields ──────────────────────────────────
export interface BaoQuanFields {
  tinhTrang: number;       // BaoQuanCondition
  canhBaoRisiko: boolean;
  lyDoCanhBao?: string;
  hanKhacPhuc?: string;
}

export interface BaoDuongFields {
  capBd: CapBaoDuong;
  chuKyNgay: number;
  checklist: ChecklistItem[];
  phuTung: PhuTungThayThe[];
  ketLuan?: string;
  ngayBdLanTiepTheo?: string;
  thoiGianThucHienGio: number;
  nhanXet?: string;
  signatures: SignatureBlock[];
}

export interface SuaChuaFields {
  mucDo: MucDoSuaChua;
  lyDo?: string;
  moTaHong?: string;
  checklist: ChecklistItem[];
  phuTung: PhuTungThayThe[];
  ketLuan?: string;
  thoiGianThucHienGio: number;
  nhanXet?: string;
  chiPhiDuKien: number;
  chiPhiThucTe: number;
  signatures: SignatureBlock[];
}

export interface NiemCatFields {
  tinhTrang: NiemCatStatus;
  viTri?: string;
  lyDo?: string;
  ngayMoDuKien?: string;
  canhBaoHetHan: boolean;
  signatures: SignatureBlock[];
}

export interface DieuDongFields {
  loai: LoaiDieuDong;
  donViNhan?: string;
  donViBaoGiao?: string;
  diaDiem?: string;
  ngayBatDau?: string;
  ngayKetThuc?: string;
  lyDo?: string;
  ghiChuKtv?: string;
  bienBan?: string;
  signatures: SignatureBlock[];
}

// ── Main TrangBiLog ────────────────────────────────────────
export interface TrangBiLog {
  id: string;
  logType: LogType;
  idTrangBi: string;
  maDanhMuc: string;
  idChuyenNganhKt?: string;

  // Equipment info (denormalized)
  tenTrangBi?: string;
  soHieuTrangBi?: string;
  donViChuQuan?: string;
  donViQuanLy?: string;
  idNhomDongBo?: string;

  // Scheduling
  ngayLapKeHoach?: string;
  ngayDuKien?: string;
  ngayThucHien?: string;
  ngayHoanThanh?: string;
  status: LogStatus;

  // Personnel
  ktvChinh?: string;
  ktvTroLy?: string;
  chiHuyDuyet?: string;

  // Type-specific
  baoQuan?: BaoQuanFields;
  baoDuong?: BaoDuongFields;
  suaChua?: SuaChuaFields;
  niemCat?: NiemCatFields;
  dieuDong?: DieuDongFields;

  // Common
  parameters: Record<string, string>;
  ghiChu?: string;
  nguoiTao?: string;
  nguoiSua?: string;
  ngayTao?: string;
  ngaySua?: string;
  version: number;
}

// ── Summary (grid view) ────────────────────────────────────
export interface TrangBiLogSummary {
  id: string;
  logType: LogType;
  idTrangBi: string;
  tenTrangBi?: string;
  soHieuTrangBi?: string;
  donViChuQuan?: string;
  status: LogStatus;
  ngayDuKien?: string;
  ngayThucHien?: string;
  ngayHoanThanh?: string;
  ktvChinh?: string;
  ngaySua?: string;
  nguoiSua?: string;
}

// ── Calendar item ──────────────────────────────────────────
export interface TrangBiLogCalendarItem {
  id: string;
  tenTrangBi?: string;
  logType: LogType;
  status: LogStatus;
  ngay?: string;
  ktvChinh?: string;
  moTa?: string;
}

// ── Technician workload ─────────────────────────────────────
export interface KTVWorkloadItem {
  ktvId: string;
  tenKtv: string;
  tongNhiemVu: number;
  daHoanThanh: number;
  conLai: number;
  taiPhanCong: number; // 0.0 – 1.0
}

// ── Stats ─────────────────────────────────────────────────
export interface LogStats {
  keHoachThang: number;
  daHoanThanh: number;
  conLai: number;
  tyLeHoanThanh: number; // 0.0 – 1.0
  quaHan: number;
  sapDenHan: number;
}

// ── Gantt row ──────────────────────────────────────────────
export interface GanttRow {
  idTrangBi: string;
  tenTrangBi: string;
  donVi: string;
  statusThang1: LogStatus;
  statusThang2: LogStatus;
  statusThang3: LogStatus;
}
