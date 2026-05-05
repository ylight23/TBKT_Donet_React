/**
 * +--------------------------------------------------------------------+
 * |  PERMISSION MANAGEMENT – UI Fallback Data & Constants              |
 * |  Catalog quyền chính lấy từ API/DB; file này chỉ dùng fallback UI |
 * +--------------------------------------------------------------------+
 */

import type {
    Role,
    ScopeConfig,
    SampleUser,
    Assignment,
} from '../../../types/permission';
import { armyOlive, deepArmyGreen, steelGray, militaryGold, statusColors } from '../../../theme';
import { permissionManifestGroupsToUi } from '../../../config/permissionManifest';

// ── System Roles ───────────────────────────────────────────────────────────────

export const SYSTEM_ROLES: Role[] = [
    { id: 'sr-1', name: 'Quản trị hệ thống', type: 'SYSTEM', userCount: 3,   color: armyOlive[700] },
    { id: 'sr-2', name: 'Chỉ huy đơn vị',   type: 'SYSTEM', userCount: 28,  color: deepArmyGreen[600] },
    { id: 'sr-3', name: 'Cán bộ kỹ thuật',  type: 'SYSTEM', userCount: 85,  color: deepArmyGreen[500] },
    { id: 'sr-4', name: 'Nhân viên',         type: 'SYSTEM', userCount: 420, color: steelGray[400] },
];

export const INITIAL_CUSTOM_ROLES: Role[] = [
    { id: 'cr-1', name: 'Cán bộ hậu cần',      type: 'CUSTOM', clonedFrom: 'sr-3', userCount: 12, color: statusColors.operational.main },
    { id: 'cr-2', name: 'Trưởng kho trang bị',  type: 'CUSTOM', clonedFrom: 'sr-3', userCount: 6,  color: militaryGold[500] },
];

// ── Permission Groups ──────────────────────────────────────────────────────────
// Nhóm quyền căn cứ theo các module thực tế của hệ thống TBKT

export const FALLBACK_PERMISSION_GROUPS = permissionManifestGroupsToUi();

// ── Role → Permission defaults ─────────────────────────────────────────────────

export const FALLBACK_ROLE_DEFAULTS: Record<string, string[]> = {
    'sr-1': [
        // Toàn quyền
        'equipment.view', 'equipment.create', 'equipment.edit', 'equipment.delete', 'equipment.export', 'equipment.group1', 'equipment.group2',
        'tech.status', 'tech.preservation', 'tech.maintenance', 'tech.repair.view', 'tech.repair.create', 'tech.storage.view', 'tech.storage.create', 'tech.transfer', 'tech.quality',
        'report.view', 'report.export', 'report.schedule', 'report.classify',
        'office.view', 'office.create', 'office.edit', 'office.delete', 'office.export',
        'employee.view', 'employee.create', 'employee.edit', 'employee.delete',
        'config.view', 'config.param', 'config.role', 'config.template', 'config.datasource', 'config.menu', 'config.audit',
        'thamso_restore',
    ],
    'sr-2': [
        // Chỉ huy: toàn bộ nghiệp vụ, không cấu hình hệ thống
        'equipment.view', 'equipment.create', 'equipment.edit', 'equipment.export', 'equipment.group1', 'equipment.group2',
        'tech.status', 'tech.preservation', 'tech.maintenance', 'tech.repair.view', 'tech.repair.create', 'tech.storage.view', 'tech.storage.create', 'tech.transfer', 'tech.quality',
        'report.view', 'report.export', 'report.schedule',
        'office.view', 'office.edit',
        'employee.view', 'employee.create', 'employee.edit',
        'config.view',
    ],
    'sr-3': [
        // Cán bộ kỹ thuật: nghiệp vụ đầy đủ, không quản lý đơn vị / nhân sự
        'equipment.view', 'equipment.create', 'equipment.edit', 'equipment.export', 'equipment.group1', 'equipment.group2',
        'tech.status', 'tech.preservation', 'tech.maintenance', 'tech.repair.view', 'tech.repair.create', 'tech.storage.view', 'tech.storage.create', 'tech.transfer', 'tech.quality',
        'report.view', 'report.export',
        'office.view',
        'employee.view',
    ],
    'sr-4': [
        // Nhân viên: chỉ xem
        'equipment.view', 'equipment.group1', 'equipment.group2',
        'tech.status',
        'report.view',
        'office.view',
        'employee.view',
    ],
    'cr-1': [
        // Cán bộ hậu cần: tập trung điều động, bảo quản
        'equipment.view', 'equipment.export', 'equipment.group1', 'equipment.group2',
        'tech.status', 'tech.preservation', 'tech.transfer',
        'report.view', 'report.export',
        'office.view',
        'employee.view',
    ],
    'cr-2': [
        // Trưởng kho: tập trung niêm cất, điều động, tình trạng
        'equipment.view', 'equipment.create', 'equipment.edit', 'equipment.export', 'equipment.group1', 'equipment.group2',
        'tech.status', 'tech.storage.view', 'tech.storage.create', 'tech.transfer',
        'report.view', 'report.export',
        'office.view',
    ],
};

// ── Primary Scope Options (B1 — simplified to 3) ──────────────────────────────
// Chỉ 3 loại phổ biến hiển thị mặc định trên UI.

export const SCOPE_TYPES: ScopeConfig[] = [
    { value: 'SUBTREE',    label: 'Trực thuộc',      desc: 'Toàn bộ nhánh từ đơn vị mình trở xuống — mặc định cho mọi user',   color: deepArmyGreen[400], risk: 'MEDIUM',   icon: '🌲', needsAnchor: true },
    { value: 'DELEGATED',  label: 'Ủy quyền',         desc: 'Nhận ủy quyền từ chỉ huy cấp trên, có thời hạn',                  color: statusColors.maintenance.main, risk: 'HIGH', icon: '🤝', needsDelegated: true, needsAnchor: true },
    { value: 'ALL',        label: 'Admin',            desc: 'Không giới hạn phạm vi — chỉ dành cho admin/cấp tổng cục',         color: statusColors.critical.main,    risk: 'CRITICAL', icon: '🌐' },
];

// ── Advanced Scope Options (ẩn mặc định, dùng cho lookup/backward compat) ──────
export const SCOPE_TYPES_ADVANCED: ScopeConfig[] = [
    // Legacy scopes are disabled by the new data-scope model.
    // { value: 'SELF',              label: 'Cá nhân',          desc: 'Chỉ dữ liệu do chính user tạo ra',                          color: steelGray[400],         risk: 'LOW',    icon: '👤' },
    // { value: 'NODE_ONLY',         label: 'Node đơn',         desc: 'Chỉ đơn vị được gán, không bao gồm cấp con',                color: deepArmyGreen[600],     risk: 'LOW',    icon: '📍', needsAnchor: true },
    // { value: 'NODE_AND_CHILDREN', label: 'Node + Con',       desc: 'Đơn vị gán và toàn bộ cấp con trực tiếp',                   color: deepArmyGreen[500],     risk: 'MEDIUM', icon: '🔽', needsAnchor: true },
    // { value: 'SIBLINGS',          label: 'Anh-em',           desc: 'Các đơn vị cùng cha và cùng cấp với node gán',               color: armyOlive[600],         risk: 'MEDIUM', icon: '↔️', needsAnchor: true },
    // { value: 'BRANCH',            label: 'Toàn nhánh',       desc: 'Từ node gán ngược lên đến root (chuỗi tổ tiên)',             color: armyOlive[500],         risk: 'MEDIUM', icon: '🔼', needsAnchor: true },
    // { value: 'MULTI_NODE',        label: 'Đa chọn',          desc: 'Chọn thủ công nhiều đơn vị độc lập trên cây',                color: militaryGold[500],       risk: 'HIGH',   icon: '🔗', needsMultiNode: true },
];

// ── Full scope map (all types) — dùng cho lookup badge/label/color ─────────────
// Legacy SCOPE_TYPES_ADVANCED is kept for reference only, not active in lookup/runtime.
// export const ALL_SCOPE_TYPES: ScopeConfig[] = [...SCOPE_TYPES, ...SCOPE_TYPES_ADVANCED];
export const ALL_SCOPE_TYPES: ScopeConfig[] = [...SCOPE_TYPES];
export const scopeLookup = new Map(ALL_SCOPE_TYPES.map(s => [s.value, s]));

// ── Default Scopes per Role ────────────────────────────────────────────────────

export const DEFAULT_SCOPES: Record<string, string> = {
    'sr-1': 'ALL',
    'sr-2': 'SUBTREE',
    // 'sr-3': 'NODE_AND_CHILDREN',
    'sr-3': 'SUBTREE',
    // 'sr-4': 'SELF',
    'sr-4': 'SUBTREE',
    'cr-1': 'SUBTREE',
    // 'cr-2': 'NODE_AND_CHILDREN',
    'cr-2': 'SUBTREE',
};

// ── Color palette for new roles ────────────────────────────────────────────────

export const ROLE_COLORS: string[] = [
    armyOlive[700], deepArmyGreen[600], deepArmyGreen[500], militaryGold[500],
    statusColors.critical.main, deepArmyGreen[400], statusColors.maintenance.main, armyOlive[500],
];

// ── Sample Users ───────────────────────────────────────────────────────────────

export const SAMPLE_USERS: SampleUser[] = [
    { id: 'u1', name: 'Nguyễn Văn An',   email: 'an.nv@tbkt.vn',    avatar: 'NA', currentOffice: 'Cơ quan tổng cục',  currentOfficePath: '/root/tc'           },
    { id: 'u2', name: 'Trần Thị Bình',   email: 'binh.tt@tbkt.vn',  avatar: 'TB', currentOffice: 'Đơn vị cấp 1',      currentOfficePath: '/root/dv1'          },
    { id: 'u3', name: 'Lê Minh Cường',   email: 'cuong.lm@tbkt.vn', avatar: 'LC', currentOffice: 'Phòng Kỹ thuật',    currentOfficePath: '/root/dv1/kt'       },
    { id: 'u4', name: 'Phạm Đức Dũng',   email: 'dung.pd@tbkt.vn',  avatar: 'PD', currentOffice: 'Phòng Hậu cần',     currentOfficePath: '/root/dv1/hc'       },
    { id: 'u5', name: 'Hoàng Thị Em',    email: 'em.ht@tbkt.vn',    avatar: 'HE', currentOffice: 'Đơn vị cơ sở 1',   currentOfficePath: '/root/dv1/kt/cs1'   },
];

// ── Sample Assignments ─────────────────────────────────────────────────────────

export const SAMPLE_ASSIGNMENTS: Assignment[] = [
    {
        id: 'a1', userId: 'u1', userName: 'Nguyễn Văn An', userAvatar: 'NA',
        userOffice: 'Cơ quan tổng cục',
        roleId: 'sr-1', roleName: 'Quản trị hệ thống', roleColor: armyOlive[700],
        anchorNodeId: 'root', anchorNodeName: 'Tổng cục', anchorNodePath: '/root/',
        scopeType: 'ALL', createdAt: '2025-01-15T08:00:00Z',
        approvalStatus: 'APPROVED',
    },
    {
        id: 'a2', userId: 'u2', userName: 'Trần Thị Bình', userAvatar: 'TB',
        userOffice: 'Đơn vị cấp 1',
        roleId: 'sr-2', roleName: 'Chỉ huy đơn vị', roleColor: deepArmyGreen[600],
        anchorNodeId: 'dv1', anchorNodeName: 'Đơn vị cấp 1', anchorNodePath: '/root/dv1/',
        scopeType: 'SUBTREE', createdAt: '2025-02-10T09:30:00Z',
        approvalStatus: 'APPROVED',
    },
    {
        id: 'a3', userId: 'u3', userName: 'Lê Minh Cường', userAvatar: 'LC',
        userOffice: 'Phòng Kỹ thuật',
        roleId: 'sr-3', roleName: 'Cán bộ kỹ thuật', roleColor: deepArmyGreen[500],
        anchorNodeId: 'kt', anchorNodeName: 'Phòng Kỹ thuật', anchorNodePath: '/root/dv1/kt/',
        // scopeType: 'NODE_AND_CHILDREN',
        scopeType: 'SUBTREE', createdAt: '2025-03-01T10:00:00Z',
        approvalStatus: 'APPROVED',
    },
    {
        id: 'a4', userId: 'u4', userName: 'Phạm Đức Dũng', userAvatar: 'PD',
        userOffice: 'Phòng Hậu cần',
        roleId: 'cr-1', roleName: 'Cán bộ hậu cần', roleColor: statusColors.operational.main,
        anchorNodeId: 'hc', anchorNodeName: 'Phòng Hậu cần', anchorNodePath: '/root/dv1/hc/',
        scopeType: 'DELEGATED',
        delegatedBy: 'u2', delegatedByName: 'Trần Thị Bình',
        expiresAt: '2026-09-01T00:00:00Z', isExpired: false,
        createdAt: '2025-03-10T14:00:00Z',
        approvalStatus: 'APPROVED',
    },
    {
        id: 'a5', userId: 'u5', userName: 'Hoàng Thị Em', userAvatar: 'HE',
        userOffice: 'Đơn vị cơ sở 1',
        roleId: 'sr-4', roleName: 'Nhân viên', roleColor: steelGray[400],
        anchorNodeId: 'cs1', anchorNodeName: 'Đơn vị cơ sở 1', anchorNodePath: '/root/dv1/kt/cs1/',
        // scopeType: 'SELF',
        scopeType: 'SUBTREE', createdAt: '2025-03-15T08:30:00Z',
        approvalStatus: 'APPROVED',
    },
];

export const PERMISSION_GROUPS = FALLBACK_PERMISSION_GROUPS;
export const ROLE_DEFAULTS = FALLBACK_ROLE_DEFAULTS;
