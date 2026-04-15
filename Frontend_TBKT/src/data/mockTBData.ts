export enum ChatLuong {
    Tot = 'Tốt',
    Kha = 'Khá',
    TrungBinh = 'Trung bình',
    Xau = 'Xấu',
    HỏngHoc = 'Hỏng hóc',
}

export enum TrangThaiTrangBi {
    HoatDong = 'Hoạt động',
    SuaChua = 'Sửa chữa',
    NiemCat = 'Niêm cất',
    ChoThanhLy = 'Chờ thanh lý',
    DaThanhLy = 'Đã thanh lý',
}

export interface IBaoDuong {
    id: string;
    maDanhMuc: string;
    tenDanhMuc: string;
    donVi: string;
    loaiBaoDuong: string;
    ngayBaoDuong: string;
    nguoiThucHien: string;
    ketQua: 'Đạt tiêu chuẩn' | 'Cần theo dõi' | 'Phát hiện lỗi';
    ghiChu: string;
}

export interface ISuaChua {
    id: string;
    maDanhMuc: string;
    tenDanhMuc: string;
    loai: string;
    donVi: string;
    loaiSuaChua: string;
    donViSuaChua: string;
    ketQua: 'Hoàn thành' | 'Đang sửa' | 'Không sửa được';
    ngayBatDau: string;
    ngayKetThuc: string;
    chiPhi: number;
    ghiChu: string;
}

export interface IChuyenCap {
    id: string;
    maDanhMuc: string;
    tenDanhMuc: string;
    donVi: string;
    capCu: ChatLuong;
    capMoi: ChatLuong;
    ngayCapNhat: string;
    lyDo: string;
    nguoiXacNhan: string;
}

export interface IDieuDong {
    id: string;
    maDanhMuc: string;
    tenDanhMuc: string;
    donViCu: string;
    donViMoi: string;
    ngayDieuDong: string;
    lyDo: string;
    nguoiDuyet: string;
    trangThai: 'Đã duyệt' | 'Chờ duyệt' | 'Đã thực hiện' | 'Hủy';
}

export interface INiemCat {
    id: string;
    maDanhMuc: string;
    tenDanhMuc: string;
    donVi: string;
    khoNiemCat: string;
    ngayNiemCat: string;
    ngayXuat?: string;
    trangThai: 'Đang niêm cất' | 'Đã xuất kho' | 'Kiểm tra định kỳ';
    ghiChu: string;
}

export const donViList: string[] = [];
export const mockBaoDuong: IBaoDuong[] = [];
export const mockSuaChua: ISuaChua[] = [];
export const mockChuyenCap: IChuyenCap[] = [];
export const mockDieuDong: IDieuDong[] = [];
export const mockNiemCat: INiemCat[] = [];
export const mockBaoQuan: any[] = [];

export const thongKeTheoLoai: any[] = [];
export const thongKeTheoDonVi: any[] = [];

export const dashboardStats = {
    tongSoLuong: 0,
    dangHoatDong: 0,
    suaChua: 0,
    niemCat: 0,
    choThanhLy: 0,
    daThanhLy: 0,
    heSoKyThuat: 0,
};

export const phanVungDonViData: any[] = [];
export const nienHanNamData: any[] = [];
