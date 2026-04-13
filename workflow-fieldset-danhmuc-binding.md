# Workflow FieldSet <-> DanhMucTrangBi Binding

## Muc tieu

Chuan hoa luong lam viec cho agent de trien khai bai toan gan `FieldSet` voi `DanhMucTrangBi` theo huong:

1. Chan du lieu sai ngay tu backend khi luu `FieldSet`.
2. Thay thao tac nhap tay `MaDanhMucTrangBi` bang tree picker tren UI.
3. Hien thi duoc so `FieldSet` dang gan vao tung node danh muc.
4. Chuan bi nen cho preview form theo danh muc va xu ly rename ma danh muc an toan.

## Thu tu uu tien

| Phase | Mo ta | Uu tien | Ly do |
| --- | --- | --- | --- |
| 1 | Backend validate `MaDanhMucTrangBi` khi luu `FieldSet` | P0 | Chan loi du lieu ngay lap tuc |
| 3 | Frontend `CauHinhThamSo` - tree picker gan `FieldSet` <-> `DanhMuc` | P0 | Giai quyet goc van de UX va giam nhap tay |
| 2 | Backend API lay `FieldSet` count theo node `DanhMuc` | P1 | Phuc vu badge tren tree |
| 4 | Frontend tree `DanhMucTrangBi` hien badge so `FieldSet` da gan | P1 | Ho tro quan sat va quan tri |
| 6 | Backend cascade update khi doi ma `DanhMuc` | P1 | Bao toan lien ket sau rename |
| 5 | Frontend preview form theo `DanhMuc` | P2 | Tang trai nghiem, khong block luong chinh |

## Nguyen tac thuc hien

- Lam Phase 1 truoc de backend an toan du lieu.
- Lam tiep Phase 3 de UI khong con phu thuoc vao nhap tay ma.
- Moi phase phai co checklist verify ro rang.
- Khong break backward compatibility neu trong DB da co du lieu cu.
- Neu gap route/API da ton tai gan giong, uu tien tai su dung thay vi them endpoint moi.
- Tab `Thong so ky thuat` khong duoc fallback hard-code sang bat ky `ChuyenNganh` mac dinh nao.
- Du lieu `Thong so ky thuat` bat buoc di theo API, dua tren `MaDanhMucTrangBi` duoc chon trong tab `Thong so chung`.
- `Thong so chung` la nguon su that de xac dinh danh muc dang active cho preview/load cau hinh dong.

## Phase 1 - Backend validate MaDanhMucTrangBi khi luu FieldSet

### Muc tieu

Dam bao `FieldSet` chi duoc luu khi `MaDanhMucTrangBi`:

- Rong/null: cho phep neu business cho phep `FieldSet` dung chung.
- Co gia tri: bat buoc phai ton tai trong cay `DanhMucTrangBi`.

### Cong viec

1. Tim luong create/update `FieldSet` trong backend.
2. Xac dinh DTO/request dang nhan `MaDanhMucTrangBi`.
3. Bo sung validation truoc khi save:
   - Trim gia tri.
   - Check ton tai theo `MaDanhMucTrangBi`.
   - Neu khong ton tai, tra ve loi nghiep vu ro rang.
4. Dam bao ca create va update dung chung validation.
5. Neu co cache/tree service cho danh muc, uu tien dung lai service hien co.

### Proto/API du kien anh huong

- `protos/ThamSo.proto`
  - Dam bao request create/update `FieldSet` co field `MaDanhMucTrangBi`.
  - Neu field chua co comment nghia vu, bo sung comment ngan gon.

### Backend files du kien can sua

- `Backend/.../FieldSet*Service*.cs`
- `Backend/.../FieldSet*Handler*.cs`
- `Backend/.../Validators/...`
- `protos/ThamSo.proto`

### Pseudo code

```csharp
var maDanhMuc = request.MaDanhMucTrangBi?.Trim();

if (!string.IsNullOrEmpty(maDanhMuc))
{
    var exists = await _danhMucTrangBiService.ExistsByCodeAsync(maDanhMuc, cancellationToken);
    if (!exists)
    {
        throw new BusinessException($"MaDanhMucTrangBi '{maDanhMuc}' khong ton tai.");
    }
}

entity.MaDanhMucTrangBi = maDanhMuc;
```

### Definition of done

- Save `FieldSet` voi ma hop le thanh cong.
- Save `FieldSet` voi ma khong ton tai bi chan.
- Update `FieldSet` doi sang ma khong hop le bi chan.
- Loi tra ve du de frontend hien thong bao.

## Phase 3 - Frontend CauHinhThamSo tree picker gan FieldSet voi DanhMuc

### Muc tieu

Tai man `CauHinhThamSo`, nguoi dung chon `DanhMucTrangBi` tu tree picker thay vi go tay `MaDanhMucTrangBi`.

### Cong viec

1. Tim form tao/sua `FieldSet` trong frontend.
2. Xac dinh control dang edit `MaDanhMucTrangBi`.
3. Thay bang tree picker hoac tree-select:
   - Load cay `DanhMucTrangBi`.
   - Cho chon 1 node.
   - Luu `MaDanhMucTrangBi`.
   - Hien ten/day duong dan node da chon de nguoi dung de xac nhan.
4. Ho tro clear selection neu `FieldSet` duoc phep khong gan node.
5. Validate UI:
   - Neu bat buoc chon node theo business, chan submit.
   - Neu optional, cho clear.
6. Neu tree lon, them search/filter co ban.

### Frontend files du kien can sua

- `Frontend_TBKT/.../CauHinhThamSo*`
- `Frontend_TBKT/.../FieldSetForm*`
- `Frontend_TBKT/.../DanhMucTrangBi*service*`
- `Frontend_TBKT/.../types*`
- Neu can: tao moi component dung chung `DanhMucTrangBiTreePicker`

### UI de xuat

- Label: `Danh muc trang bi`
- Input chinh:
  - button/input mo drawer-popover tree
  - search box
  - tree node label + ma
- Vung summary sau khi chon:
  - `Ma`: value se save
  - `Ten`: label hien thi
  - `Duong dan`: breadcrumb tu root -> node

### Pseudo code

```tsx
<DanhMucTrangBiTreePicker
  value={form.values.maDanhMucTrangBi}
  onChange={(node) => {
    form.setFieldValue("maDanhMucTrangBi", node?.ma ?? "");
    form.setFieldValue("tenDanhMucTrangBi", node?.ten ?? "");
  }}
  allowClear
/>
```

### Definition of done

- Form create/edit `FieldSet` khong con can go tay ma.
- Chon node va save thanh cong.
- Edit record cu hien dung node da gan.
- Clear node hoat dong dung theo rule nghiep vu.

## Rang buoc bo sung - Tab Thong so ky thuat

### Rule bat buoc

- Khong hard-code fallback `ChuyenNganhThongTinRaDa` hoac bat ky ma chuyen nganh/mac dinh nao trong tab `Thong so ky thuat`.
- Khi chua chon `MaDanhMucTrangBi` trong `Thong so chung`, tab `Thong so ky thuat` chi hien state trong/huong dan chon danh muc, khong tu y nap cau hinh khac.
- Khi da chon `MaDanhMucTrangBi`, frontend phai goi API theo ma nay de lay `FieldSet`/cau hinh dong tuong ung.
- Khi user doi `MaDanhMucTrangBi` trong `Thong so chung`, tab `Thong so ky thuat` phai reload theo ma moi.
- Neu API khong tra du lieu, hien empty state dung nghiep vu, khong fallback sang bo field hard-code.

### Hanh vi UI mong muon

1. User vao `Thong so chung` va chon `MaDanhMucTrangBi`.
2. Gia tri duoc luu trong form state cha/shared state.
3. Tab `Thong so ky thuat` doc gia tri nay de goi API.
4. API tra danh sach `FieldSet`/dynamic fields theo danh muc da chon.
5. UI render dung theo response thuc te.

### Definition of done

- Khong con tham chieu hard-code `ChuyenNganhThongTinRaDa` trong luong load `Thong so ky thuat`.
- Refresh trang va doi tab van giu logic load theo `MaDanhMucTrangBi` thuc te.
- Neu chua chon danh muc, UI khong render sai du lieu cua danh muc khac.

## Phase 2 - Backend API lay FieldSet count theo DanhMuc node

### Muc tieu

Tra ve thong tin so `FieldSet` dang gan vao moi `DanhMucTrangBi` de frontend hien badge.

### Cong viec

1. Khao sat API tree `DanhMucTrangBi` hien tai.
2. Chon 1 trong 2 huong:
   - Bo sung `fieldsetCount` vao payload tree.
   - Tao endpoint rieng tra map `maDanhMuc -> count`.
3. Tinh count theo `MaDanhMucTrangBi`.
4. Xac dinh co can aggregate len parent hay chi node duoc gan truc tiep.
5. Toi uu query de khong N+1.

### Proto/API du kien anh huong

- `protos/DanhMucTrangBi.proto`
  - Them `FieldSetCount` neu can tra truc tiep trong tree node DTO.

### Definition of done

- Frontend co du lieu count on dinh de render badge.
- Query khong gay cham dang ke tren tree lon.

## Phase 4 - Frontend DanhMucTrangBi tree hien badge so FieldSet da gan

### Muc tieu

Tren tree `DanhMucTrangBi`, moi node co badge hien so `FieldSet` lien quan.

### Cong viec

1. Noi count tu Phase 2 vao model tree.
2. Render badge can bang, khong lam roi layout.
3. Quy uoc hien thi:
   - `0` an badge hoac de mo theo UX quyet dinh.
   - `>0` hien badge mau nhe, de doc.
4. Neu co search/filter tree, badge van dung.

### Definition of done

- Tree hien count ro rang, khong nhieu.
- Khong anh huong thao tac expand/collapse/chon node.

## Phase 5 - Frontend preview form theo DanhMuc

### Muc tieu

Gia lap trai nghiem `AddTrangBiDialog`: chon 1 `DanhMuc`, xem truoc form dong se dung cac `FieldSet` nao.

### Cong viec

1. Gom `FieldSet` theo `MaDanhMucTrangBi`.
2. Chon node danh muc.
3. Render preview readonly hoac interactive nhe.
4. Hien thu tu nhom truong, nhan dien field bat buoc, loai control.

### Definition of done

- User quan sat duoc form se sinh ra truoc khi vao luong them moi thuc te.

## Phase 6 - Backend cascade update khi doi ma DanhMuc

### Muc tieu

Khi doi `MaDanhMucTrangBi`, tat ca `FieldSet` dang reference ma cu duoc cap nhat theo.

### Cong viec

1. Tim luong rename ma danh muc.
2. Xac dinh event/command/service xu ly rename.
3. Trong transaction hoac quy trinh nhat quan:
   - update node danh muc
   - update cac `FieldSet.MaDanhMucTrangBi = maMoi`
4. Ghi log so record bi anh huong.
5. Xem xet lock/concurrency neu rename hiem nhung anh huong lon.

### Definition of done

- Sau rename, khong con `FieldSet` treo ma cu.
- Khong pha vo doc form dong hien tai.

## Checklist trien khai de xuat cho agent

### Dot 1 - Lam ngay

- [ ] Doc `protos/ThamSo.proto`
- [ ] Tim create/update flow cua `FieldSet` backend
- [ ] Implement validation `MaDanhMucTrangBi`
- [ ] Regen code neu repo dang dung generated proto output
- [ ] Verify create/update `FieldSet`
- [ ] Tim form `CauHinhThamSo` edit `FieldSet`
- [ ] Thay input text bang tree picker
- [ ] Verify create/edit/clear binding tren UI

### Dot 2 - Sau khi P0 xong

- [ ] Bo sung count API
- [ ] Hien badge count tren tree
- [ ] Danh gia can aggregate parent hay khong

### Dot 3 - Nang cap sau

- [ ] Preview form theo danh muc
- [ ] Cascade update khi rename ma danh muc

## Ghi chu ky thuat

- Neu backend hien dang luu ma raw string, chua can doi schema DB o Phase 1.
- Neu frontend dang co tree `DanhMucTrangBi` o man khac, uu tien tach thanh component/service dung chung.
- Neu API tree da rat lon, uu tien lazy load + search theo server o Phase 3; neu chua can, co the load full tree truoc.
- Can kiem tra du lieu lich su: co `FieldSet` nao dang tro toi `MaDanhMucTrangBi` khong con ton tai hay khong. Neu co, frontend edit mode nen hien canh bao mem.
- Can ra soat frontend de loai bo moi fallback hard-code dang map `Thong so ky thuat` sang mot `ChuyenNganh` co dinh.

## Risk can luu y

| Risk | Tac dong | Cach giam |
| --- | --- | --- |
| Du lieu cu dang tro ma khong hop le | Edit/save record cu co the fail | Hien canh bao va cho user rebind |
| Tree danh muc lon | UI picker cham | Them search, lazy load neu can |
| Rename ma danh muc khong cascade | Mat lien ket FieldSet | Lam Phase 6 sau khi P0/P1 on dinh |
| Generated proto can sync nhieu noi | Build fail neu quen regen | Note ro buoc regen trong checklist |

## Huong dan cho agent

Khi bat dau implement:

1. Mo file nay va follow theo thu tu `Phase 1` -> `Phase 3`.
2. Khong nhay sang badge/count truoc khi validation backend da xong.
3. Sau moi phase, cap nhat lai file nay hoac tao note ngan ve:
   - File da sua
   - API da doi
   - Cach verify
   - Viec con ton

## File tham chieu chinh

- `workflow-fieldset-danhmuc-binding.md`
- `protos/ThamSo.proto`
- `protos/DanhMucTrangBi.proto`
- Backend `FieldSet` service/handler/validator
- Frontend `CauHinhThamSo` va form edit `FieldSet`
