namespace Backend.Authorization;

/// <summary>
/// Immutable per-request access gate — single source of truth for all authorization checks.
/// Built once by <see cref="AccessGateBuilder"/>, cached in request context,
/// consumed by FuncGuard / DataScopeGuard / ActionGuard.
///
/// Naming family:
///   AccessGate          → struct chính (this)
///   AccessGateBuilder   → build từ cache/DB
///   AccessGuard         → middleware inject AccessGate vào context
///   FuncGuard           → guard quyền chức năng
///   DataScopeGuard      → guard lọc dữ liệu theo CN
///   ActionGuard         → guard action-per-CN
/// </summary>
public sealed class AccessGate
{
    // ── Singleton instances ─────────────────────────────────────────

    /// <summary>SuperAdmin — bypass mọi kiểm tra.</summary>
    public static readonly AccessGate SuperAdmin = new()
    {
        IsSuperAdmin = true,
        ScopeType = "ALL",
    };

    /// <summary>Empty — mặc định, chỉ có SUBTREE scope, không có quyền nào.</summary>
    public static readonly AccessGate Empty = new()
    {
        ScopeType = "SUBTREE",
    };

    // ── Identity ────────────────────────────────────────────────────

    /// <summary>ID người dùng.</summary>
    public string UserId { get; init; } = "";

    /// <summary>True nếu user là superadmin/admin.</summary>
    public bool IsSuperAdmin { get; init; }

    // ── Chiều 1: Phạm vi đơn vị ─────────────────────────────────────

    /// <summary>Loại phạm vi: SUBTREE, DELEGATED, ALL, ...</summary>
    public string ScopeType { get; init; } = "SUBTREE";

    /// <summary>ID đơn vị mốc (nếu có).</summary>
    public string AnchorNodeId { get; init; } = "";

    /// <summary>ID đơn vị cha của mốc (dùng cho scope SIBLINGS).</summary>
    public string AnchorParentId { get; init; } = "";

    // ── Chiều 2: Quyền chức năng (lớp 1 cũ) ────────────────────────

    /// <summary>
    /// MaChucNang → set of allowed actions (view, add, edit, delete, approve, download, print).
    /// </summary>
    public IReadOnlyDictionary<string, HashSet<string>> FuncActions { get; init; }
        = new Dictionary<string, HashSet<string>>();

    // ── Chiều 3: Phạm vi chuyên ngành (lớp 2 cũ) ───────────────────

    /// <summary>Danh sách IDChuyenNganh mà user được thấy dữ liệu.</summary>
    public IReadOnlyList<string> VisibleCNs { get; init; } = Array.Empty<string>();

    /// <summary>
    /// IDChuyenNganh → set of allowed actions.
    /// Đây là chiều mới — "action nào trên CN nào" — khe hở HIGH cần bịt.
    /// </summary>
    public IReadOnlyDictionary<string, HashSet<string>> ActionsPerCN { get; init; }
        = new Dictionary<string, HashSet<string>>();

    /// <summary>
    /// Internal service scopes resolved from MaPhanHe, used for microservice-ready enforcement.
    /// Example: "tbkt-thongtin", "tbkt-kythuat".
    /// </summary>
    public IReadOnlyList<string> ServiceScopes { get; init; } = Array.Empty<string>();

    // ── Guard methods ───────────────────────────────────────────────

    /// <summary>
    /// FuncGuard — có quyền gọi chức năng này không?
    /// Wrapper logic đã có ở Global.CanAccessComponentAction.
    /// </summary>
    /// <param name="maChucNang">Mã chức năng cần kiểm tra.</param>
    /// <param name="actions">Các action cần có ít nhất 1 (view, add, edit...). Nếu rỗng thì chỉ cần có entry.</param>
    public bool CanCallFunc(string maChucNang, params string[] actions)
    {
        if (IsSuperAdmin) return true;
        if (string.IsNullOrEmpty(maChucNang)) return false;
        if (!FuncActions.TryGetValue(maChucNang, out var allowed)) return false;
        return actions.Length == 0 || actions.Any(a => allowed.Contains(a));
    }

    /// <summary>
    /// DataScopeGuard — danh sách CN mà user được đọc dữ liệu.
    /// Trả về rỗng nếu SuperAdmin (= không hạn chế).
    /// </summary>
    public IReadOnlyList<string> GetVisibleCNs()
    {
        if (IsSuperAdmin) return Array.Empty<string>(); // empty = no filter
        return VisibleCNs;
    }

    /// <summary>
    /// ActionGuard ⭐ — method mới duy nhất thực sự cần viết.
    /// Kiểm tra: action X có được phép trên entity thuộc CN Y không?
    /// </summary>
    /// <param name="action">Tên action: view, add, edit, delete, approve, download, print.</param>
    /// <param name="idChuyenNganh">ID chuyên ngành của entity cần kiểm tra.</param>
    /// <returns>True nếu được phép.</returns>
    public bool CanActOnCN(string action, string? idChuyenNganh)
    {
        if (IsSuperAdmin) return true;
        if (string.IsNullOrEmpty(idChuyenNganh)) return true; // no CN = no restriction
        if (ActionsPerCN.Count == 0) return true; // no CN rules configured = allow all
        if (!ActionsPerCN.TryGetValue(idChuyenNganh, out var allowed)) return false;
        return allowed.Contains(action);
    }

    /// <summary>
    /// Có nằm trong danh sách CN được thấy không?
    /// </summary>
    public bool CanSeeCN(string? idChuyenNganh)
    {
        if (IsSuperAdmin) return true;
        if (string.IsNullOrEmpty(idChuyenNganh)) return true;
        if (VisibleCNs.Count == 0) return true; // no restriction
        return VisibleCNs.Contains(idChuyenNganh);
    }

    /// <summary>
    /// Check whether the current user policy contains the given internal service scope.
    /// </summary>
    public bool CanAccessServiceScope(string serviceScope)
    {
        if (IsSuperAdmin) return true;
        if (string.IsNullOrWhiteSpace(serviceScope)) return false;
        if (ServiceScopes.Count == 0) return false;
        return ServiceScopes.Contains(serviceScope, StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>
    /// Module-level gate (DuocTruyCap) check by MaPhanHe.
    /// </summary>
    public bool CanAccessModule(string maPhanHe)
    {
        if (IsSuperAdmin) return true;
        var serviceScope = ServiceScopeResolver.ResolveServiceScope(maPhanHe);
        return CanAccessServiceScope(serviceScope);
    }

    /// <summary>
    /// Lấy danh sách actions cho phép trên 1 CN cụ thể (chỉ chiều CN).
    /// Dùng cho response API — client biết được "CN này được làm gì".
    /// </summary>
    public IReadOnlyCollection<string> GetAllowedActions(string idChuyenNganh)
    {
        if (IsSuperAdmin) return AllActions;
        if (string.IsNullOrEmpty(idChuyenNganh)) return AllActions;
        if (ActionsPerCN.Count == 0) return AllActions;
        return ActionsPerCN.TryGetValue(idChuyenNganh, out var actions)
            ? actions
            : Array.Empty<string>();
    }

    // ── Combined 2-dimension checks ─────────────────────────────────

    /// <summary>
    /// CanPerformAction ⭐⭐ — Kiểm tra giao nhau 2 chiều:
    ///   Chiều 1: FuncActions — user có quyền {action} trên chức năng {maChucNang}?
    ///   Chiều 2: ActionsPerCN — user có quyền {action} trên entity thuộc CN {idChuyenNganh}?
    /// Chỉ trả true nếu CẢ HAI chiều đều cho phép.
    /// 
    /// VD: checkedCodes có trangbi.edit, nhưng ActionsPerCN["thongtin"] chỉ có [view,download]
    ///     → CanPerformAction("trangbi", "edit", "thongtin") = false
    /// </summary>
    /// <param name="maChucNang">Module prefix: "trangbi", "baoduong", ...</param>
    /// <param name="action">Action cần kiểm tra: view, add, edit, delete, approve, ...</param>
    /// <param name="idChuyenNganh">ID chuyên ngành của entity. Null/empty = skip chiều CN.</param>
    public bool CanPerformAction(string maChucNang, string action, string? idChuyenNganh)
    {
        if (IsSuperAdmin) return true;

        // Chiều 1: quyền chức năng
        if (!CanCallFunc(maChucNang, action)) return false;

        // Chiều 2: quyền trên CN cụ thể
        if (!CanActOnCN(action, idChuyenNganh)) return false;

        return true;
    }

    /// <summary>
    /// Full policy check in strict order:
    /// 1) SuperAdmin -> allow
    /// 2) DuocTruyCap (module gate) -> deny if closed
    /// 3) Action on function -> deny if missing
    /// 4) Scope on CN -> deny if out of scope
    /// </summary>
    public bool CanPerformAction(string maPhanHe, string maChucNang, string action, string? idChuyenNganh)
    {
        if (IsSuperAdmin) return true;
        if (!CanAccessModule(maPhanHe)) return false;
        if (!CanCallFunc(maChucNang, action)) return false;
        if (!CanActOnCN(action, idChuyenNganh)) return false;
        return true;
    }

    /// <summary>
    /// GetEffectiveActions — Trả về tập giao nhau (intersection) giữa
    /// FuncActions[maChucNang] và ActionsPerCN[idChuyenNganh].
    /// Đây chính là "user thực tế được làm gì trên entity thuộc CN này".
    /// Dùng để render UI: nút nào hiện, nút nào ẩn.
    /// </summary>
    public IReadOnlyList<string> GetEffectiveActions(string maChucNang, string idChuyenNganh)
    {
        if (IsSuperAdmin) return (IReadOnlyList<string>)AllActions;

        // Lấy actions từ chiều 1 (FuncActions)
        HashSet<string> funcSet;
        if (!string.IsNullOrEmpty(maChucNang) && FuncActions.TryGetValue(maChucNang, out var fa))
            funcSet = fa;
        else
            funcSet = new HashSet<string>(); // không có quyền chức năng = empty

        // Lấy actions từ chiều 2 (ActionsPerCN)
        var cnActions = GetAllowedActions(idChuyenNganh);

        // Giao nhau
        var result = new List<string>();
        foreach (var action in cnActions)
        {
            if (funcSet.Contains(action))
                result.Add(action);
        }
        return result;
    }

    // ── Constants ───────────────────────────────────────────────────

    /// <summary>Tất cả actions có trong hệ thống.</summary>
    public static readonly IReadOnlyCollection<string> AllActions = new[]
    {
        "view", "add", "edit", "delete", "approve", "unapprove", "download", "print"
    };
}
