/**
 * +--------------------------------------------------------------------+
 * |  PERMISSION MANAGEMENT SYSTEM – TypeScript Types                   |
 * |  Model: RBAC + ABAC (Scope-based, relative to Office tree)         |
 * +--------------------------------------------------------------------+
 */

// ── Scope Types ────────────────────────────────────────────────────────────────

export type ScopeType =
    | 'SELF'               // Chỉ data cá nhân
    | 'NODE_ONLY'          // Chỉ node được gán
    | 'NODE_AND_CHILDREN'  // Node + con trực tiếp
    | 'SUBTREE'            // Toàn bộ cây con
    | 'SIBLINGS'           // Anh-em cùng cha, cùng cấp
    | 'BRANCH'             // Chi nhánh (ancestor lên root)
    | 'MULTI_NODE'         // Nhiều node độc lập
    | 'ALL'                // Toàn hệ thống (HIGH RISK)
    | 'DELEGATED';         // Ủy quyền (có delegator + expiresAt)

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RoleType = 'SYSTEM' | 'CUSTOM';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ── Core Interfaces ────────────────────────────────────────────────────────────

export interface Permission {
    code: string;
    name: string;
}

export interface PermissionGroup {
    group: string;
    icon: string;
    permissions: Permission[];
}

export interface Role {
    id: string;
    name: string;
    type: RoleType;
    clonedFrom?: string;
    userCount: number;
    color: string;
    description?: string;
}

export interface ScopeConfig {
    value: ScopeType;
    label: string;
    desc: string;
    color: string;
    risk: RiskLevel;
    icon?: string;
    needsAnchor?: boolean;
    needsMultiNode?: boolean;
    needsDelegated?: boolean;
    example?: string;
}

export type PermissionAction =
    | 'view'
    | 'add'
    | 'edit'
    | 'delete'
    | 'approve'
    | 'unapprove'
    | 'download'
    | 'print';

export interface ChuyenNganhDocScope {
    id: string;
    actions: PermissionAction[];
}

export interface PhamViChuyenNganhConfig {
    idChuyenNganh: string;
    idChuyenNganhDoc: ChuyenNganhDocScope[];
}

export interface GroupScopeConfig {
    scopeType: ScopeType;
    anchorNodeId?: string;
    multiNodeIds: string[];
    duocTruyCap?: boolean;
    phamViChuyenNganh?: PhamViChuyenNganhConfig;
}

// ── AccessGate: action-per-CN (maps to proto ChuyenNganhAccess) ────────────────

/** Một entry trả về từ GetMyPermissions.actionsPerCn */
export interface ChuyenNganhAccessEntry {
    idChuyenNganh: string;
    actions: PermissionAction[];
}

export interface PermissionUserRow {
    id: string;
    name: string;
    email: string;
    avatar: string;
    rank?: string;
    currentOffice?: string;
    currentOfficePath?: string;
    anchorNodeId?: string;
    anchorNodeName?: string;
    scopeType?: string;
    phamViChuyenNganh?: PhamViChuyenNganhConfig;
    ngayHetHan?: string;
    idNguoiUyQuyen?: string;
    idAssignment?: string;
}

export interface PermissionAssignmentRow {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    userRank?: string;
    userOffice?: string;
    roleId: string;
    roleName: string;
    roleColor: string;
    anchorNodeId: string;
    anchorNodeName: string;
    anchorNodePath: string;
    scopeType: ScopeType | '';
    phamViChuyenNganh?: PhamViChuyenNganhConfig;
    idNguoiUyQuyen?: string;
    multiNodeIds?: string[];
    multiNodeNames?: string[];
    delegatedBy?: string;
    delegatedByName?: string;
    expiresAt?: string;           // ISO date
    isExpired?: boolean;
    approvalStatus?: ApprovalStatus;
    createdAt: string;
}

// Backward-compatible aliases for old fallback-only code paths.
export type SampleUser = PermissionUserRow;
export type Assignment = PermissionAssignmentRow;

// ── Permission Tab ─────────────────────────────────────────────────────────────

export type PermissionTabKey = 'permissions' | 'scope' | 'users' | 'assignments';

// ── State shape (for PermissionContext) ─────────────────────────────────────────

export interface PermissionState {
    roles: Role[];
    customRoles: Role[];
    selectedRoleId: string;
    rolePermissions: Record<string, string[]>;
    defaultScopes: Record<string, ScopeType>;
    assignments: PermissionAssignmentRow[];
    users: PermissionUserRow[];
    activeTab: PermissionTabKey;
    unsaved: boolean;
    loading: boolean;
}
