using System;

namespace DepositosTrayAgent.Models;

public sealed class AppSettings
{
    public string BackendBaseUrl { get; set; } = "http://192.168.85.50:3000";

    public string DashboardUrl { get; set; } = "http://192.168.85.50:3000/kanban";

    public string AgentName { get; set; } = Environment.MachineName;

    public string AgentGroup { get; set; } = "general";

    public string MachineAlias { get; set; } = string.Empty;
}
