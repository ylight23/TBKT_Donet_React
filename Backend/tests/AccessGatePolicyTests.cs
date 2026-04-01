using Backend.Authorization;
using Xunit;

namespace Backend.Authorization.Tests;

public class AccessGatePolicyTests
{
    [Fact]
    public void Step1_SuperAdmin_AlwaysAllow()
    {
        var gate = AccessGate.SuperAdmin;

        var allowed = gate.CanPerformAction("TBKT.ThongTin", "equipment.edit", "edit", "radar");

        Assert.True(allowed);
    }

    [Fact]
    public void Step2_DuocTruyCapFalse_DenyBeforeAction()
    {
        var gate = new AccessGate
        {
            ServiceScopes = Array.Empty<string>(),
            FuncActions = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase)
            {
                ["equipment.edit"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "edit" },
            },
            ActionsPerCN = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase)
            {
                ["radar"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "edit" },
            },
        };

        var allowed = gate.CanPerformAction("TBKT.ThongTin", "equipment.edit", "edit", "radar");

        Assert.False(allowed);
    }

    [Fact]
    public void Step3_ActionMissing_Deny()
    {
        var gate = new AccessGate
        {
            ServiceScopes = new[] { "tbkt-thongtin" },
            FuncActions = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase)
            {
                ["equipment.edit"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "view" },
            },
            ActionsPerCN = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase)
            {
                ["radar"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "edit" },
            },
        };

        var allowed = gate.CanPerformAction("TBKT.ThongTin", "equipment.edit", "edit", "radar");

        Assert.False(allowed);
    }

    [Fact]
    public void Step4_ScopeNotMatched_Deny()
    {
        var gate = new AccessGate
        {
            ServiceScopes = new[] { "tbkt-thongtin" },
            FuncActions = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase)
            {
                ["equipment.edit"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "edit" },
            },
            ActionsPerCN = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase)
            {
                ["thongtin"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "edit" },
            },
        };

        var allowed = gate.CanPerformAction("TBKT.ThongTin", "equipment.edit", "edit", "radar");

        Assert.False(allowed);
    }

    [Fact]
    public void AllStepsSatisfied_Allow()
    {
        var gate = new AccessGate
        {
            ServiceScopes = new[] { "tbkt-thongtin" },
            FuncActions = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase)
            {
                ["equipment.edit"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "edit" },
            },
            ActionsPerCN = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase)
            {
                ["radar"] = new HashSet<string>(StringComparer.OrdinalIgnoreCase) { "edit" },
            },
        };

        var allowed = gate.CanPerformAction("TBKT.ThongTin", "equipment.edit", "edit", "radar");

        Assert.True(allowed);
    }
}
