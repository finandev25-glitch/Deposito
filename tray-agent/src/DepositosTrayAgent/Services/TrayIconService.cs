using System;
using System.Drawing;
using System.Windows.Forms;

namespace DepositosTrayAgent.Services;

public sealed class TrayIconService : IDisposable
{
    private readonly NotifyIcon _notifyIcon;
    private readonly Action _onOpenSettings;
    private readonly Action _onOpenDashboard;
    private readonly Action _onExit;

    public TrayIconService(Action onOpenSettings, Action onOpenDashboard, Action onExit)
    {
        _onOpenSettings = onOpenSettings;
        _onOpenDashboard = onOpenDashboard;
        _onExit = onExit;

        var menu = new ContextMenuStrip();
        menu.Items.Add("Abrir configuracion", null, (_, _) => _onOpenSettings());
        menu.Items.Add("Abrir sistema", null, (_, _) => _onOpenDashboard());
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add("Salir", null, (_, _) => _onExit());

        _notifyIcon = new NotifyIcon
        {
            Text = "Depositos - apoyo",
            Visible = true,
            Icon = SystemIcons.Warning,
            ContextMenuStrip = menu,
        };

        _notifyIcon.DoubleClick += (_, _) => _onOpenSettings();
    }

    public void ShowBalloon(string title, string message)
    {
        _notifyIcon.BalloonTipTitle = title;
        _notifyIcon.BalloonTipText = message;
        _notifyIcon.BalloonTipIcon = ToolTipIcon.Warning;
        _notifyIcon.ShowBalloonTip(3000);
    }

    public void UpdateTooltip(string text)
    {
        _notifyIcon.Text = string.IsNullOrWhiteSpace(text) ? "Depositos - apoyo" : text[..Math.Min(text.Length, 63)];
    }

    public void Dispose()
    {
        _notifyIcon.Visible = false;
        _notifyIcon.Dispose();
    }
}
