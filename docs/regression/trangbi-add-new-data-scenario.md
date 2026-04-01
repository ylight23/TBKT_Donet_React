# Kich ban them moi du lieu Trang bi

## 1) Muc tieu
Xac nhan luong them moi Trang bi hoat dong dung theo cau hinh form, bao gom:
- Mo dialog them moi
- Nhap du lieu theo cac tab
- Luu du lieu
- Hien thi ban ghi moi trong danh sach

## 2) Pham vi hien tai
Trang Nhom 1 va Nhom 2 dang dung du lieu mock, luu tren UI dang o muc gia lap (alert thanh cong), chua goi API tao moi.

## 3) Tien dieu kien
- Da dang nhap he thong
- Mo man hinh Trang bi Nhom 1 hoac Nhom 2
- Cau hinh tham so (FormConfig, FieldSet, DynamicField) da tai thanh cong
- Khong co canh bao loi cau hinh tren man hinh

## 4) Du lieu mau de nhap
- Ten trang bi: Bo dam co dinh 25W
- Ky hieu: BD-25W-001
- Nhom: Nhom 1
- ID Chuyen nganh KT: TTLL
- Don vi quan ly: CUC-TT
- Nam su dung: 2024
- Tinh trang: Tot

Ghi chu: Field thuc te phu thuoc vao FormConfig dang active.

## 5) Kich ban chinh (happy path)
1. Vao man hinh Trang bi Nhom 1.
2. Bam nut Them trang bi.
3. Kiem tra dialog mo dung tieu de va hien cac tab cau hinh.
4. Nhap day du cac truong bat buoc o tab hien tai.
5. Neu co nhieu tab, bam Tiep tuc den het cac tab va nhap truong bat buoc.
6. Bam Luu trang bi.
7. Xac nhan thong bao thanh cong.
8. Dong dialog va kiem tra ban ghi moi xuat hien trong bang.

## 6) Kich ban am tinh
### Case A - Bo trong truong bat buoc
1. Mo dialog Them trang bi.
2. Bo trong mot truong bat buoc.
3. Bam Luu.
4. Ky vong: Hien thong bao loi validation, khong dong dialog, khong tao ban ghi.

### Case B - Du lieu sai dinh dang
1. Nhap truong so bang chu (vi du Nam su dung = abc).
2. Bam Luu.
3. Ky vong: Bao loi dinh dang du lieu.

### Case C - Dong dialog khi chua luu
1. Nhap mot phan du lieu.
2. Bam Huy/Dong.
3. Mo lai dialog.
4. Ky vong: Form duoc reset, khong giu du lieu cu.

## 7) Kiem tra bo sung
- Nut Them trang bi bi disable khi dang tai schema hoac co loi config.
- Chuyen tab khong mat du lieu da nhap trong phien dialog.
- Progress % tren dialog thay doi theo so field da nhap.

## 8) Ket qua mong doi theo trang thai hien tai
- He thong hien thong bao "Luu thanh cong! (Gia lap)".
- Chua co ban ghi duoc persist xuong backend.

## 9) Tieu chi hoan tat khi noi API that
- Sau khi bam Luu, UI goi API tao moi thanh cong.
- Ban ghi moi xuat hien trong bang ma khong can reload trang.
- Ban ghi ton tai khi refresh trang.
- Co xu ly loi API (timeout, 4xx/5xx) va hien thong bao ro rang.
