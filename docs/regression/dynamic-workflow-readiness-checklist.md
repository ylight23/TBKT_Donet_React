# Checklist Readiness Quy Trinh Dong (Trang bi nhom)

## Muc tieu
Xac nhan team cau hinh da dat muc san sang truoc khi mo rong van hanh quy trinh dong.

## A. Cau hinh bat buoc
- [ ] Da tao TemplateLayout va schemaJson hop le (render duoc).
- [ ] Da tao DataSource va bat `enabled`.
- [ ] DataSource co `sourceKey` on dinh, khong trung.
- [ ] DataSource da gan `templateKey` dung voi template can dung.
- [ ] Da tao Menu item va gan `dataSource` dung.
- [ ] Neu menu can render template, xac nhan runtime lay duoc `datasource.templateKey`.

## B. Action button (trong template)
- [ ] Nut Them moi dung `preset=create` hoac `actionKey=create_item`.
- [ ] Da cau hinh `createFormKey` ro rang tren button.
- [ ] Khong phu thuoc vao gia dinh `templateKey == formKey`.
- [ ] Nut Export/Import/Print map dung intent (`export_list`, `import_list`, `print_list`).

## C. Form cau hinh dong
- [ ] Ton tai FormConfig co key trung `createFormKey`.
- [ ] FormConfig map day du FieldSet + DynamicField active.
- [ ] Cac truong bat buoc co validation phu hop.
- [ ] Thu duoc create popup khong rơi vao fallback field.

## D. Runtime E2E
- [ ] Vao menu dong render dung template.
- [ ] Bam nut Them moi mo dung popup form.
- [ ] Luu thanh cong goi `saveDynamicMenuRow`.
- [ ] Sau luu, du lieu refresh lai tren man hinh.
- [ ] Refresh trang van thay du lieu vua tao.

## E. Dieu kien chot san sang
- [ ] Khong con canh bao mismatch mapping trong log/runtime.
- [ ] Khong con luong create nao thieu `formKey`.
- [ ] Team da chot nguon su that: template runtime uu tien theo datasource.
