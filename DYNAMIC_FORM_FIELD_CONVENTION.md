# Dynamic Form Field Convention

Tai lieu ngan cho doi cau hinh form dong trong `Cau hinh tham so`.

## Muc tieu

Thong nhat cach dat `key` de runtime co the:

- render dung dictionary/tree
- auto-fill cac field phu thuoc
- khoa dung cac field he thong
- tranh admin cau hinh lech key roi form khong hoat dong dung

## 1. Field chon danh muc trang bi

Day la field nguon, nguoi dung truc tiep chon trong popup tree.

Nen dung mot trong cac `key` sau:

- `ma_danh_muc_trang_bi`
- `ma_dinh_danh`
- `iddanhmuctrangbi`

Cau hinh nen dung:

- `type = select`
- `validation.dataSource = api`
- `validation.apiUrl = /DanhMucTrangBi.DanhMucTrangBiService/GetListTree`
- `validation.displayType = tree`

Gia tri luu thuc te:

- luu `id` cua node danh muc trang bi

UI hien thi:

- hien `ten` cua node da chon

## 2. Field ma cap tren

Day la field he thong, khong cho nguoi dung nhap tay.

Nen dung mot trong cac `key` sau:

- `id_cap_tren`
- `ma_cap_tren`

Hanh vi runtime:

- auto-fill tu `idCapTren` cua node danh muc da chon
- tu dong `readonly/disabled`

Khuyen nghi:

- bat `disabled = true` trong cau hinh field

## 3. Field ten danh muc

Day la field hien thi phu, de nguoi dung thay ten danh muc vua chon.

Nen dung key sau:

- `ten_danh_muc_trang_bi`

Hanh vi runtime:

- auto-fill tu `ten` cua node danh muc da chon
- neu `ten` rong thi fallback `tenDayDu`, cuoi cung moi fallback `id`
- tu dong `readonly/disabled`

Khuyen nghi:

- bat `disabled = true` trong cau hinh field

## 4. Mapping auto-fill dang duoc runtime ho tro

Khi nguoi dung thay doi field danh muc trang bi, runtime se tu dong:

1. Goi `DanhMucTrangBiService.GetTree(id)`
2. Doc node dang chon
3. Fill cac field phu thuoc neu form co ton tai dung `key`

Bang mapping:

| Nhom field | Key convention | Nguon du lieu |
|---|---|---|
| Danh muc trang bi | `ma_danh_muc_trang_bi`, `ma_dinh_danh`, `iddanhmuctrangbi` | `node.id` |
| Ma cap tren | `id_cap_tren`, `ma_cap_tren` | `node.idCapTren` |
| Ten danh muc | `ten_danh_muc_trang_bi` | `node.ten` |

## 5. Field nao nen readonly

Nen `readonly/disabled`:

- `id_cap_tren`
- `ma_cap_tren`
- `ten_danh_muc_trang_bi`
- `ten_danh_muc`

Khong nen `readonly`:

- field nguon chon danh muc: `ma_danh_muc_trang_bi` / `ma_dinh_danh`

## 6. Mau cau hinh toi thieu

### Field 1: Ma danh muc trang bi

- `key = ma_danh_muc_trang_bi`
- `type = select`
- `dataSource = api`
- `apiUrl = /DanhMucTrangBi.DanhMucTrangBiService/GetListTree`
- `displayType = tree`

### Field 2: Ten danh muc

- `key = ten_danh_muc_trang_bi`
- `type = text`
- `disabled = true`

### Field 3: Ma cap tren

- `key = id_cap_tren`
- `type = text`
- `disabled = true`

## 7. Khuyen nghi dat ten

De de maintain, nen uu tien dung dung 3 key sau:

- `ma_danh_muc_trang_bi`
- `ten_danh_muc_trang_bi`
- `id_cap_tren`

Khong nen moi form dat mot bien the khac nhau neu khong can thiet.

## 8. Luu y

- Runtime hien tai nhan nhieu alias key de tuong thich nguoc.
- Tuy vay, doi cau hinh nen chuan hoa field moi theo bo key khuyen nghi.
- Neu tao field moi ma khong dung key convention, runtime se khong auto-fill duoc.
