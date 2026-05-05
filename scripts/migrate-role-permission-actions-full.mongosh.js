const dbName = 'quanly_dmcanbo';
const database = db.getSiblingDB(dbName);

const rolePermission = database.getCollection('RolePermission');
const userPermissionCache = database.getCollection('UserPermission');

const now = new Date();
const systemUser = 'migration.role-permission-actions-full';
const allActions = {
  view: true,
  add: true,
  edit: true,
  delete: true,
  approve: true,
  unapprove: true,
  download: true,
  print: true,
};

const cursor = rolePermission.find({
  $or: [
    { Actions: { $exists: false } },
    { 'Actions.view': true },
  ],
});

let scanned = 0;
let updated = 0;

while (cursor.hasNext()) {
  const doc = cursor.next();
  scanned += 1;

  const current = doc.Actions || {};
  const nextActions = {
    view: current.view === true || current.view === undefined,
    add: current.add === true || current.add === undefined,
    edit: current.edit === true || current.edit === undefined,
    delete: current.delete === true || current.delete === undefined,
    approve: current.approve === true || current.approve === undefined,
    unapprove: current.unapprove === true || current.unapprove === undefined,
    download: current.download === true || current.download === undefined,
    print: current.print === true || current.print === undefined,
  };

  // Existing checked RolePermission used to imply all backend operations because
  // legacy services only checked view. This preserves behavior before admins
  // tighten action-level permissions in the UI.
  rolePermission.updateOne(
    { _id: doc._id },
    {
      $set: {
        Actions: Object.assign({}, allActions, nextActions),
        NguoiSua: systemUser,
        NgaySua: now,
      },
    },
  );
  updated += 1;
}

const deletedCache = userPermissionCache.deleteMany({}).deletedCount;

printjson({
  dbName,
  scanned,
  updated,
  deletedUserPermissionCache: deletedCache,
  note: 'RolePermission.Actions da duoc mo du action de giu hanh vi cu; vao UI phan quyen de siết lai tung action.',
});
