// // =====================================================
// // Employee Types
// // =====================================================
// export interface Employee {
//   id: string;
//   tenTaiKhoan: string;
//   matKhau: string;
//   hoVaTen: string;
//   idDonVi: string;
//   idQuanTriDonVi: string;
//   idCapBac: string;
//   chucVu: string;
//   dienThoai: string;
//   hinhAnh: string;
//   email: string;
//   delete: boolean;
//   ngaySinh?: Date | string | null;
//   ngayThietLapMatKhau?: Date | string | null;
//   dangNhapCuoi?: Date | string | null;
//   truyCapCuoi?: Date | string | null;
//   kichHoat: boolean;
//   hashKey?: string | null;
//   createBy?: string | null;
//   createDate?: Date | string | null;
//   modifyBy?: string | null;
//   modifyDate?: Date | string | null;
//   deleteDate?: Date | string | null;
//   deleteBy?: string | null;
//   accessLevel?: number | null;
// }

// export interface EmployeeSearch {
//   employee?: Partial<Employee>;
//   pagerSettings?: PagerSettings;
//   searchText?: string;
// }

// // =====================================================
// // Office Types
// // =====================================================
// export interface Office {
//   id: string;
//   maDonVi: string;
//   tenDonVi: string;
//   idDonViCha: string;
//   idDonViRoot: string;
//   capDonVi: number;
//   soThuTu: number;
//   dienThoai: string;
//   diaChi: string;
//   ghiChu: string;
//   delete: boolean;
//   kichHoat: boolean;
//   createBy?: string | null;
//   createDate?: Date | string | null;
//   modifyBy?: string | null;
//   modifyDate?: Date | string | null;
//   deleteDate?: Date | string | null;
//   deleteBy?: string | null;
// }

// export interface OfficeSearch {
//   office?: Partial<Office>;
//   pagerSettings?: PagerSettings;
//   searchText?: string;
// }

// // =====================================================
// // Catalog Types (CapBac, etc.)
// // =====================================================
// export interface CapBac {
//   id: string;
//   ma: string;
//   ten: string;
//   soThuTu: number;
//   kichHoat: boolean;
// }

// export interface Catalog {
//   id: string;
//   ma: string;
//   ten: string;
//   moTa?: string;
//   soThuTu: number;
//   kichHoat: boolean;
// }

// // =====================================================
// // Pager Types
// // =====================================================
// export interface PagerSettings {
//   index: number;
//   size: number;
//   totalCount?: number;
// }

// // =====================================================
// // API Response Types
// // =====================================================
// export interface ApiResponse<T> {
//   success: boolean;
//   message: string;
//   messageException?: string;
//   item?: T;
//   items?: T[];
//   pagerSettings?: PagerSettings;
// }

// export interface ListResponse<T> {
//   items: T[];
//   success: boolean;
//   message: string;
//   messageException?: string;
//   pagerSettings?: PagerSettings;
// }

// export interface SingleResponse<T> {
//   item: T;
//   success: boolean;
//   message: string;
//   messageException?: string;
// }

// // =====================================================
// // Auth Types
// // =====================================================
// export interface AuthUser {
//   id: string;
//   tenTaiKhoan: string;
//   hoVaTen: string;
//   email: string;
//   accessLevel?: number;
// }

// export interface LoginRequest {
//   tenTaiKhoan: string;
//   matKhau: string;
// }

// export interface LoginResponse {
//   success: boolean;
//   message: string;
//   token?: string;
//   user?: AuthUser;
// }

// // =====================================================
// // UI Types
// // =====================================================
// export interface SelectOption<T = string> {
//   value: T;
//   label: string;
// }

// export interface TreeNode {
//   id: string;
//   label: string;
//   children?: TreeNode[];
//   data?: Office;
// }

// export interface FilterParams {
//   hoVaTen?: string;
//   idDonVi?: string;
//   idCapBac?: string;
//   chucVu?: string;
//   kichHoat?: boolean;
// }

// // =====================================================
// // DataGrid Column Types
// // =====================================================
// export interface ColumnDef<T = unknown> {
//   field: string;
//   headerName: string;
//   width?: number;
//   flex?: number;
//   sortable?: boolean;
//   filterable?: boolean;
//   renderCell?: (params: { row: T; value: unknown }) => React.ReactNode;
// }

// // =====================================================
// // Excel Import/Export Types
// // =====================================================
// export interface ExcelEmployeeRow {
//   'Họ và tên'?: string;
//   'Email'?: string;
//   'Điện thoại'?: string;
//   'Đơn vị'?: string;
//   'Cấp bậc'?: string;
//   'Chức vụ'?: string;
//   'Ngày sinh'?: string | Date;
//   'Trạng thái'?: string | boolean;
//   [key: string]: unknown;
// }

// export interface ExcelOfficeRow {
//   'Mã đơn vị'?: string;
//   'Tên đơn vị'?: string;
//   'Đơn vị cha'?: string;
//   'Địa chỉ'?: string;
//   'Điện thoại'?: string;
//   'Ghi chú'?: string;
//   [key: string]: unknown;
// }
