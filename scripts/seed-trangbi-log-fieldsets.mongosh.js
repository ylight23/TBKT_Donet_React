/**
 * seed-trangbi-log-fieldsets.mongosh.js
 *
 * Seed FieldSets + DynamicFields cho 5 nghiệp vụ nhật ký trang bị:
 *   bao_quan, bao_duong, sua_chua, niem_cat, dieu_dong
 *
 * Chạy: mongosh --host localhost:27017 < seed-trangbi-log-fieldsets.mongosh.js
 * Hoặc: mongosh "mongodb://localhost:27017/quanly_dmcanbo" seed-trangbi-log-fieldsets.mongosh.js
 */

const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);

const dynamicFieldCol = database.getCollection('DynamicField');
const fieldSetCol = database.getCollection('FieldSet');

const now = new Date();
const actor = 'seed-trangbi-log-fieldsets';

// ============================================================
// UUID prefixes (last 12 digits vary per entity)
// ============================================================
const P = {
  // BaoQuan
  BQ_FS:    'e3b0c442-98fc-1c39-b35a-b44d88e90001',
  BQ_F1:    'e3b0c442-98fc-1c39-b35a-b44d88e90011',
  BQ_F2:    'e3b0c442-98fc-1c39-b35a-b44d88e90012',
  BQ_F3:    'e3b0c442-98fc-1c39-b35a-b44d88e90013',
  // BaoDuong
  BD_FS:    'e3b0c442-98fc-1c39-b35a-b44d88e90020',
  BD_F1:    'e3b0c442-98fc-1c39-b35a-b44d88e90021',
  BD_F2:    'e3b0c442-98fc-1c39-b35a-b44d88e90022',
  BD_F3:    'e3b0c442-98fc-1c39-b35a-b44d88e90023',
  BD_F4:    'e3b0c442-98fc-1c39-b35a-b44d88e90024',
  // SuaChua
  SC_FS:    'e3b0c442-98fc-1c39-b35a-b44d88e90030',
  SC_F1:    'e3b0c442-98fc-1c39-b35a-b44d88e90031',
  SC_F2:    'e3b0c442-98fc-1c39-b35a-b44d88e90032',
  SC_F3:    'e3b0c442-98fc-1c39-b35a-b44d88e90033',
  SC_F4:    'e3b0c442-98fc-1c39-b35a-b44d88e90034',
  SC_F5:    'e3b0c442-98fc-1c39-b35a-b44d88e90035',
  // NiemCat
  NC_FS:    'e3b0c442-98fc-1c39-b35a-b44d88e90040',
  NC_F1:    'e3b0c442-98fc-1c39-b35a-b44d88e90041',
  NC_F2:    'e3b0c442-98fc-1c39-b35a-b44d88e90042',
  NC_F3:    'e3b0c442-98fc-1c39-b35a-b44d88e90043',
  // DieuDong
  DD_FS:    'e3b0c442-98fc-1c39-b35a-b44d88e90050',
  DD_F1:    'e3b0c442-98fc-1c39-b35a-b44d88e90051',
  DD_F2:    'e3b0c442-98fc-1c39-b35a-b44d88e90052',
  DD_F3:    'e3b0c442-98fc-1c39-b35a-b44d88e90053',
  DD_F4:    'e3b0c442-98fc-1c39-b35a-b44d88e90054',
};

const defaultValidation = {
  MinLength: 0,
  MaxLength: 0,
  Pattern: '',
  Min: 0,
  Max: 0,
  DataSource: '',
  ApiUrl: '',
  DisplayType: '',
  Options: [],
};

function toProtoTimestamp(date) {
  const ms = date instanceof Date ? date.getTime() : new Date(date).getTime();
  const seconds = Math.floor(ms / 1000);
  const nanos = Math.floor((ms - seconds * 1000) * 1000000);
  return {
    Seconds: NumberLong(String(seconds)),
    Nanos: NumberInt(String(nanos)),
  };
}

function mergeValidation(validation) {
  return { ...defaultValidation, ...(validation || {}) };
}

function upsertField(field) {
  dynamicFieldCol.updateOne(
    { _id: field.id },
    {
      $set: {
        Key: field.key,
        Label: field.label,
        Type: field.type,
        Required: field.required,
        Validation: mergeValidation(field.validation),
        CnIds: field.cnIds ?? [],
        Delete: false,
        ModifyDate: toProtoTimestamp(now),
        NguoiSua: actor,
      },
      $setOnInsert: {
        CreateDate: toProtoTimestamp(now),
        NguoiTao: actor,
        Version: 1,
      },
    },
    { upsert: true },
  );
}

function upsertFieldSet(fieldSet) {
  fieldSetCol.updateOne(
    { _id: fieldSet.id },
    {
      $set: {
        Name: fieldSet.name,
        Icon: fieldSet.icon,
        Color: fieldSet.color,
        Desc: fieldSet.desc ?? '',
        FieldIds: fieldSet.fieldIds,
        LoaiNghiepVu: fieldSet.loaiNghiepVu,
        Delete: false,
        ModifyDate: toProtoTimestamp(now),
        NguoiSua: actor,
      },
      $setOnInsert: {
        CreateDate: toProtoTimestamp(now),
        NguoiTao: actor,
        Version: 1,
      },
    },
    { upsert: true },
  );
}

// ============================================================
// BAO QUAN (Preservation / Storage Condition)
// ============================================================
// FieldSet: "Đánh giá tình trạng"
const baoQuanTinhTrangFields = [
  {
    id: P.BQ_F1,
    key: 'tinh_trang',
    label: 'Tình trạng bảo quản',
    type: 'select',
    required: true,
    validation: { Options: ['Tot', 'Kha', 'TrungBinh', 'Kem'] },
  },
  {
    id: P.BQ_F2,
    key: 'canh_bao_risiko',
    label: 'Cảnh báo rủi ro',
    type: 'checkbox',
    required: false,
  },
  {
    id: P.BQ_F3,
    key: 'ly_do_canh_bao',
    label: 'Lý do cảnh báo',
    type: 'textarea',
    required: false,
    validation: { MaxLength: 500 },
  },
];

// FieldSet: "Khắc phục"
const baoQuanKhacPhucFields = [
  {
    id: P.BQ_F1 + '-extra1',
    key: 'han_khac_phuc',
    label: 'Hạn khắc phục',
    type: 'date',
    required: false,
  },
  {
    id: P.BQ_F1 + '-extra2',
    key: 'ghi_chu_bao_quan',
    label: 'Ghi chú bảo quản',
    type: 'textarea',
    required: false,
    validation: { MaxLength: 1000 },
  },
];

// ============================================================
// BAO DUONG (Maintenance)
// ============================================================
// FieldSet: "Phân loại bảo dưỡng"
const baoDuongLoaiFields = [
  {
    id: P.BD_F1,
    key: 'cap_bd',
    label: 'Cấp bảo dưỡng',
    type: 'select',
    required: true,
    validation: { Options: ['1', '2', '3', '4'] },
  },
  {
    id: P.BD_F1 + '-extra1',
    key: 'ten_ke_hoach_bd',
    label: 'Tên kế hoạch bảo dưỡng',
    type: 'text',
    required: false,
    validation: { MaxLength: 200 },
  },
];

// FieldSet: "Chu kỳ & Lịch"
const baoDuongLichFields = [
  {
    id: P.BD_F2,
    key: 'chu_ky_ngay',
    label: 'Chu kỳ (ngày)',
    type: 'number',
    required: false,
    validation: { Min: 1 },
  },
  {
    id: P.BD_F2 + '-extra1',
    key: 'ngay_bd_lan_tiep_theo',
    label: 'Ngày BD lần tiếp theo',
    type: 'date',
    required: false,
  },
  {
    id: P.BD_F2 + '-extra2',
    key: 'thoi_gian_thuc_hien_gio',
    label: 'Thời gian thực hiện (giờ)',
    type: 'number',
    required: false,
    validation: { Min: 0 },
  },
];

// FieldSet: "Kết luận"
const baoDuongKetLuanFields = [
  {
    id: P.BD_F3,
    key: 'ket_luan',
    label: 'Kết luận bảo dưỡng',
    type: 'textarea',
    required: false,
    validation: { MaxLength: 500 },
  },
  {
    id: P.BD_F3 + '-extra1',
    key: 'nhan_xet',
    label: 'Nhận xét',
    type: 'textarea',
    required: false,
    validation: { MaxLength: 500 },
  },
  {
    id: P.BD_F3 + '-extra2',
    key: 'ghi_chu_bao_duong',
    label: 'Ghi chú',
    type: 'textarea',
    required: false,
    validation: { MaxLength: 1000 },
  },
];

// FieldSet: "Ký duyệt"
const baoDuongKyDuyetFields = [
  {
    id: P.BD_F4,
    key: 'nguoi_ky_duyet',
    label: 'Người ký duyệt',
    type: 'text',
    required: false,
    validation: { MaxLength: 100 },
  },
  {
    id: P.BD_F4 + '-extra1',
    key: 'ngay_ky_duyet',
    label: 'Ngày ký duyệt',
    type: 'date',
    required: false,
  },
];

// ============================================================
// SUA CHUA (Repair)
// ============================================================
// FieldSet: "Phân loại sửa chữa"
const suaChuaLoaiFields = [
  {
    id: P.SC_F1,
    key: 'muc_do',
    label: 'Mức độ sửa chữa',
    type: 'select',
    required: true,
    validation: { Options: ['1', '2', '3', '4'] },
  },
  {
    id: P.SC_F1 + '-extra1',
    key: 'ly_do',
    label: 'Lý do sửa chữa',
    type: 'textarea',
    required: false,
    validation: { MaxLength: 500 },
  },
];

// FieldSet: "Mô tả hỏng hóc"
const suaChuaHongHocFields = [
  {
    id: P.SC_F2,
    key: 'mo_ta_hong',
    label: 'Mô tả hỏng hóc',
    type: 'textarea',
    required: false,
    validation: { MaxLength: 1000 },
  },
  {
    id: P.SC_F2 + '-extra1',
    key: 'vi_tri_hong',
    label: 'Vị trí hỏng',
    type: 'text',
    required: false,
    validation: { MaxLength: 200 },
  },
];

// FieldSet: "Chi phí"
const suaChuaChiPhiFields = [
  {
    id: P.SC_F3,
    key: 'chi_phi_du_kien',
    label: 'Chi phí dự kiến (VND)',
    type: 'number',
    required: false,
    validation: { Min: 0 },
  },
  {
    id: P.SC_F3 + '-extra1',
    key: 'chi_phi_thuc_te',
    label: 'Chi phí thực tế (VND)',
    type: 'number',
    required: false,
    validation: { Min: 0 },
  },
  {
    id: P.SC_F3 + '-extra2',
    key: 'thoi_gian_thuc_hien_gio',
    label: 'Thời gian thực hiện (giờ)',
    type: 'number',
    required: false,
    validation: { Min: 0 },
  },
];

// FieldSet: "Kết luận"
const suaChuaKetLuanFields = [
  {
    id: P.SC_F4,
    key: 'ket_luan',
    label: 'Kết luận sửa chữa',
    type: 'textarea',
    required: false,
    validation: { MaxLength: 500 },
  },
  {
    id: P.SC_F4 + '-extra1',
    key: 'nhan_xet',
    label: 'Nhận xét',
    type: 'textarea',
    required: false,
    validation: { MaxLength: 500 },
  },
  {
    id: P.SC_F4 + '-extra2',
    key: 'ghi_chu_sua_chua',
    label: 'Ghi chú',
    type: 'textarea',
    required: false,
    validation: { MaxLength: 1000 },
  },
];

// FieldSet: "Ký duyệt"
const suaChuaKyDuyetFields = [
  {
    id: P.SC_F5,
    key: 'nguoi_ky_duyet',
    label: 'Người ký duyệt',
    type: 'text',
    required: false,
    validation: { MaxLength: 100 },
  },
  {
    id: P.SC_F5 + '-extra1',
    key: 'ngay_ky_duyet',
    label: 'Ngày ký duyệt',
    type: 'date',
    required: false,
  },
];

// ============================================================
// NIEM CAT (Sealing / Storage)
// ============================================================
// FieldSet: "Tình trạng niêm cất"
const niemCatTinhTrangFields = [
  {
    id: P.NC_F1,
    key: 'tinh_trang',
    label: 'Tình trạng niêm cất',
    type: 'select',
    required: true,
    validation: { Options: ['DaDongGoi', 'ChuaDongGoi', 'DaMo', 'HuyBo'] },
  },
  {
    id: P.NC_F1 + '-extra1',
    key: 'vi_tri',
    label: 'Vị trí lưu trữ',
    type: 'text',
    required: false,
    validation: { MaxLength: 200 },
  },
  {
    id: P.NC_F1 + '-extra2',
    key: 'ly_do',
    label: 'Lý do niêm cất',
    type: 'textarea',
    required: false,
    validation: { MaxLength: 500 },
  },
];

// FieldSet: "Cảnh báo & Lịch"
const niemCatCanhBaoFields = [
  {
    id: P.NC_F2,
    key: 'canh_bao_het_han',
    label: 'Cảnh báo hết hạn niêm cất',
    type: 'checkbox',
    required: false,
  },
  {
    id: P.NC_F2 + '-extra1',
    key: 'ngay_mo_du_kien',
    label: 'Ngày mở dự kiến',
    type: 'date',
    required: false,
  },
  {
    id: P.NC_F2 + '-extra2',
    key: 'ghi_chu_niem_cat',
    label: 'Ghi chú',
    type: 'textarea',
    required: false,
    validation: { MaxLength: 1000 },
  },
];

// FieldSet: "Ký duyệt"
const niemCatKyDuyetFields = [
  {
    id: P.NC_F3,
    key: 'nguoi_ky_duyet',
    label: 'Người ký duyệt',
    type: 'text',
    required: false,
    validation: { MaxLength: 100 },
  },
  {
    id: P.NC_F3 + '-extra1',
    key: 'ngay_ky_duyet',
    label: 'Ngày ký duyệt',
    type: 'date',
    required: false,
  },
];

// ============================================================
// DIEU DONG (Transfer / Dispatch)
// ============================================================
// FieldSet: "Phân loại điều động"
const dieuDongLoaiFields = [
  {
    id: P.DD_F1,
    key: 'loai',
    label: 'Loại điều động',
    type: 'select',
    required: true,
    validation: { Options: ['NoiBo', 'ChuyenChuyenNganh', 'DonViBaoGiao', 'DonViNhan'] },
  },
  {
    id: P.DD_F1 + '-extra1',
    key: 'ly_do',
    label: 'Lý do điều động',
    type: 'textarea',
    required: false,
    validation: { MaxLength: 500 },
  },
];

// FieldSet: "Thông tin đơn vị"
const dieuDongDonViFields = [
  {
    id: P.DD_F2,
    key: 'don_vi_nhan',
    label: 'Đơn vị nhận',
    type: 'text',
    required: false,
    validation: { MaxLength: 200 },
  },
  {
    id: P.DD_F2 + '-extra1',
    key: 'don_vi_bao_giao',
    label: 'Đơn vị bàn giao',
    type: 'text',
    required: false,
    validation: { MaxLength: 200 },
  },
  {
    id: P.DD_F2 + '-extra2',
    key: 'dia_diem',
    label: 'Địa điểm',
    type: 'text',
    required: false,
    validation: { MaxLength: 300 },
  },
];

// FieldSet: "Lịch trình"
const dieuDongLichTrinhFields = [
  {
    id: P.DD_F3,
    key: 'ngay_bat_dau',
    label: 'Ngày bắt đầu',
    type: 'date',
    required: false,
  },
  {
    id: P.DD_F3 + '-extra1',
    key: 'ngay_ket_thuc',
    label: 'Ngày kết thúc',
    type: 'date',
    required: false,
  },
];

// FieldSet: "Ký duyệt & Biên bản"
const dieuDongKyDuyetFields = [
  {
    id: P.DD_F4,
    key: 'nguoi_ky_duyet',
    label: 'Người ký duyệt',
    type: 'text',
    required: false,
    validation: { MaxLength: 100 },
  },
  {
    id: P.DD_F4 + '-extra1',
    key: 'ngay_ky_duyet',
    label: 'Ngày ký duyệt',
    type: 'date',
    required: false,
  },
  {
    id: P.DD_F4 + '-extra2',
    key: 'bien_ban',
    label: 'Số biên bản bàn giao',
    type: 'text',
    required: false,
    validation: { MaxLength: 100 },
  },
  {
    id: P.DD_F4 + '-extra3',
    key: 'ghi_chu_ktv',
    label: 'Ghi chú KTV',
    type: 'textarea',
    required: false,
    validation: { MaxLength: 1000 },
  },
];

// ============================================================
// UPSERT — DynamicFields
// ============================================================
const allFields = [
  ...baoQuanTinhTrangFields,
  ...baoQuanKhacPhucFields,
  ...baoDuongLoaiFields,
  ...baoDuongLichFields,
  ...baoDuongKetLuanFields,
  ...baoDuongKyDuyetFields,
  ...suaChuaLoaiFields,
  ...suaChuaHongHocFields,
  ...suaChuaChiPhiFields,
  ...suaChuaKetLuanFields,
  ...suaChuaKyDuyetFields,
  ...niemCatTinhTrangFields,
  ...niemCatCanhBaoFields,
  ...niemCatKyDuyetFields,
  ...dieuDongLoaiFields,
  ...dieuDongDonViFields,
  ...dieuDongLichTrinhFields,
  ...dieuDongKyDuyetFields,
];

allFields.forEach(upsertField);

// ============================================================
// UPSERT — FieldSets
// ============================================================
const fieldSets = [
  // ── Bao Quan ────────────────────────────────────────────────
  {
    id: P.BQ_FS,
    name: 'Đánh giá tình trạng bảo quản',
    icon: 'Inventory2',
    color: '#22c55e',
    desc: 'Phản ánh tình trạng thực tế của trang bị khi kiểm tra bảo quản',
    fieldIds: baoQuanTinhTrangFields.map(f => f.id),
    loaiNghiepVu: 'bao_quan',
  },
  {
    id: P.BQ_FS + '-khacphuc',
    name: 'Khắc phục & Ghi chú',
    icon: 'Build',
    color: '#16a34a',
    desc: 'Hạn khắc phục và ghi chú bổ sung cho bảo quản',
    fieldIds: baoQuanKhacPhucFields.map(f => f.id),
    loaiNghiepVu: 'bao_quan',
  },

  // ── Bao Duong ───────────────────────────────────────────────
  {
    id: P.BD_FS,
    name: 'Phân loại bảo dưỡng',
    icon: 'Engineering',
    color: '#3b82f6',
    desc: 'Cấp bảo dưỡng và tên kế hoạch',
    fieldIds: baoDuongLoaiFields.map(f => f.id),
    loaiNghiepVu: 'bao_duong',
  },
  {
    id: P.BD_FS + '-lich',
    name: 'Chu kỳ & Lịch bảo dưỡng',
    icon: 'Schedule',
    color: '#2563eb',
    desc: 'Chu kỳ bảo dưỡng và ngày thực hiện',
    fieldIds: baoDuongLichFields.map(f => f.id),
    loaiNghiepVu: 'bao_duong',
  },
  {
    id: P.BD_FS + '-ketluan',
    name: 'Kết luận bảo dưỡng',
    icon: 'CheckCircle',
    color: '#1d4ed8',
    desc: 'Kết luận và nhận xét sau bảo dưỡng',
    fieldIds: baoDuongKetLuanFields.map(f => f.id),
    loaiNghiepVu: 'bao_duong',
  },
  {
    id: P.BD_FS + '-kydueyet',
    name: 'Ký duyệt bảo dưỡng',
    icon: 'Approval',
    color: '#1e40af',
    desc: 'Thông tin ký duyệt bảo dưỡng',
    fieldIds: baoDuongKyDuyetFields.map(f => f.id),
    loaiNghiepVu: 'bao_duong',
  },

  // ── Sua Chua ───────────────────────────────────────────────
  {
    id: P.SC_FS,
    name: 'Phân loại sửa chữa',
    icon: 'Handyman',
    color: '#f59e0b',
    desc: 'Mức độ và lý do sửa chữa',
    fieldIds: suaChuaLoaiFields.map(f => f.id),
    loaiNghiepVu: 'sua_chua',
  },
  {
    id: P.SC_FS + '-honghoc',
    name: 'Mô tả hỏng hóc',
    icon: 'ReportProblem',
    color: '#d97706',
    desc: 'Chi tiết hỏng hóc và vị trí',
    fieldIds: suaChuaHongHocFields.map(f => f.id),
    loaiNghiepVu: 'sua_chua',
  },
  {
    id: P.SC_FS + '-chiphi',
    name: 'Chi phí sửa chữa',
    icon: 'Payments',
    color: '#b45309',
    desc: 'Chi phí dự kiến, thực tế và thời gian thực hiện',
    fieldIds: suaChuaChiPhiFields.map(f => f.id),
    loaiNghiepVu: 'sua_chua',
  },
  {
    id: P.SC_FS + '-ketluan',
    name: 'Kết luận sửa chữa',
    icon: 'CheckCircle',
    color: '#92400e',
    desc: 'Kết luận và nhận xét sau sửa chữa',
    fieldIds: suaChuaKetLuanFields.map(f => f.id),
    loaiNghiepVu: 'sua_chua',
  },
  {
    id: P.SC_FS + '-kydueyet',
    name: 'Ký duyệt sửa chữa',
    icon: 'Approval',
    color: '#78350f',
    desc: 'Thông tin ký duyệt sửa chữa',
    fieldIds: suaChuaKyDuyetFields.map(f => f.id),
    loaiNghiepVu: 'sua_chua',
  },

  // ── Niem Cat ───────────────────────────────────────────────
  {
    id: P.NC_FS,
    name: 'Tình trạng niêm cất',
    icon: 'Archive',
    color: '#8b5cf6',
    desc: 'Tình trạng và vị trí niêm cất trang bị',
    fieldIds: niemCatTinhTrangFields.map(f => f.id),
    loaiNghiepVu: 'niem_cat',
  },
  {
    id: P.NC_FS + '-canhbao',
    name: 'Cảnh báo & Lịch mở',
    icon: 'NotificationsActive',
    color: '#7c3aed',
    desc: 'Cảnh báo hết hạn và ngày mở dự kiến',
    fieldIds: niemCatCanhBaoFields.map(f => f.id),
    loaiNghiepVu: 'niem_cat',
  },
  {
    id: P.NC_FS + '-kydueyet',
    name: 'Ký duyệt niêm cất',
    icon: 'Approval',
    color: '#6d28d9',
    desc: 'Thông tin ký duyệt niêm cất',
    fieldIds: niemCatKyDuyetFields.map(f => f.id),
    loaiNghiepVu: 'niem_cat',
  },

  // ── Dieu Dong ───────────────────────────────────────────────
  {
    id: P.DD_FS,
    name: 'Phân loại điều động',
    icon: 'SwapHoriz',
    color: '#06b6d4',
    desc: 'Loại điều động và lý do',
    fieldIds: dieuDongLoaiFields.map(f => f.id),
    loaiNghiepVu: 'dieu_dong',
  },
  {
    id: P.DD_FS + '-donvi',
    name: 'Thông tin đơn vị',
    icon: 'Business',
    color: '#0891b2',
    desc: 'Đơn vị nhận, bàn giao và địa điểm',
    fieldIds: dieuDongDonViFields.map(f => f.id),
    loaiNghiepVu: 'dieu_dong',
  },
  {
    id: P.DD_FS + '-lichtrinh',
    name: 'Lịch trình điều động',
    icon: 'Event',
    color: '#0e7490',
    desc: 'Ngày bắt đầu và kết thúc điều động',
    fieldIds: dieuDongLichTrinhFields.map(f => f.id),
    loaiNghiepVu: 'dieu_dong',
  },
  {
    id: P.DD_FS + '-kydueyet',
    name: 'Ký duyệt & Biên bản',
    icon: 'Gavel',
    color: '#155e75',
    desc: 'Ký duyệt, biên bản bàn giao và ghi chú KTV',
    fieldIds: dieuDongKyDuyetFields.map(f => f.id),
    loaiNghiepVu: 'dieu_dong',
  },
];

fieldSets.forEach(upsertFieldSet);

// ============================================================
// Summary
// ============================================================
print('========================================');
print('Seed: TrangBiLog FieldSets');
print('========================================');
print('Database:', dbName);
print('Field count:', allFields.length);
print('FieldSet count:', fieldSets.length);
print('');
print('BaoQuan FieldSets:');
fieldSets.filter(fs => fs.loaiNghiepVu === 'bao_quan').forEach(fs => print('  -', fs.name, '(' + fs.fieldIds.length + ' fields)'));
print('');
print('BaoDuong FieldSets:');
fieldSets.filter(fs => fs.loaiNghiepVu === 'bao_duong').forEach(fs => print('  -', fs.name, '(' + fs.fieldIds.length + ' fields)'));
print('');
print('SuaChua FieldSets:');
fieldSets.filter(fs => fs.loaiNghiepVu === 'sua_chua').forEach(fs => print('  -', fs.name, '(' + fs.fieldIds.length + ' fields)'));
print('');
print('NiemCat FieldSets:');
fieldSets.filter(fs => fs.loaiNghiepVu === 'niem_cat').forEach(fs => print('  -', fs.name, '(' + fs.fieldIds.length + ' fields)'));
print('');
print('DieuDong FieldSets:');
fieldSets.filter(fs => fs.loaiNghiepVu === 'dieu_dong').forEach(fs => print('  -', fs.name, '(' + fs.fieldIds.length + ' fields)'));
print('');
print('Done. Reload the app to see fieldsets in the dialogs.');
