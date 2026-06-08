using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Threading;
using System.Threading.Tasks;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Threading;
using DepositosTrayAgent.Models;
using DepositosTrayAgent.Services;
using DepositosTrayAgent.Views;

namespace DepositosTrayAgent;

public sealed class TrayAppController : IDisposable
{
    private readonly IClassicDesktopStyleApplicationLifetime _desktop;
    private readonly SettingsStore _settingsStore = new();
    private readonly SupportRequestApi _api = new();
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly Queue<SupportRequestRecord> _pendingQueue = new();
    private readonly HashSet<string> _activeRequestIds = new(StringComparer.OrdinalIgnoreCase);

    private CancellationTokenSource _monitorCts = new();
    private TrayIconService? _trayIcon;
    private SupportAlertWindow? _currentAlertWindow;
    private MainWindow? _mainWindow;

    public AppSettings Settings { get; private set; }
    public string StatusText { get; private set; } = "Iniciando...";

    public TrayAppController(IClassicDesktopStyleApplicationLifetime desktop)
    {
        _desktop = desktop;
        Settings = _settingsStore.Load();
    }

    public Task InitializeAsync()
    {
        _desktop.ShutdownMode = Avalonia.Controls.ShutdownMode.OnExplicitShutdown;
        _mainWindow = new MainWindow(this);

        _trayIcon = new TrayIconService(
            ShowMainWindow,
            OpenDashboard,
            ExitApp);

        RestartMonitoring();
        return Task.CompletedTask;
    }

    public void ShowMainWindow()
    {
        Dispatcher.UIThread.Post(() =>
        {
            if (_mainWindow == null)
            {
                _mainWindow = new MainWindow(this);
            }

            if (!_mainWindow.IsVisible)
            {
                _mainWindow.Show();
            }

            _mainWindow.WindowState = Avalonia.Controls.WindowState.Normal;
            _mainWindow.Activate();
        });
    }

    public void OpenDashboard()
    {
        var url = "https://deposito.gnfcio.easypanel.host/kanban";

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true,
            });
        }
        catch (Exception ex)
        {
            SetStatus($"No se pudo abrir el sistema: {ex.Message}");
        }
    }

    public async Task<bool> AcknowledgeAndOpenDashboardAsync(SupportRequestRecord record)
    {
        try
        {
            if (record.Id != null)
            {
                await _api.AcknowledgeAsync(Settings, record.Id!, Settings.AgentName);
                await HandleSupportRequestClosedAsync(record.Id!);
            }

            OpenDashboard();
            return true;
        }
        catch (Exception ex)
        {
            SetStatus($"No se pudo abrir y marcar como atendido: {ex.Message}");
            return false;
        }
    }

    public async Task<bool> ExpireSupportRequestAsync(SupportRequestRecord record)
    {
        try
        {
            if (record.Id != null)
            {
                await _api.ExpireAsync(Settings, record.Id!);
                await HandleSupportRequestClosedAsync(record.Id!);
            }

            return true;
        }
        catch (Exception ex)
        {
            SetStatus($"No se pudo marcar como vencido: {ex.Message}");
            return false;
        }
    }

    public Task SaveSettingsAsync(AppSettings updatedSettings)
    {
        Settings.BackendBaseUrl = updatedSettings.BackendBaseUrl?.Trim() ?? string.Empty;
        Settings.DashboardUrl = updatedSettings.DashboardUrl?.Trim() ?? string.Empty;
        Settings.AgentName = string.IsNullOrWhiteSpace(updatedSettings.AgentName)
            ? Environment.MachineName
            : updatedSettings.AgentName.Trim();
        Settings.AgentGroup = updatedSettings.AgentGroup?.Trim() ?? string.Empty;
        Settings.MachineAlias = updatedSettings.MachineAlias?.Trim() ?? string.Empty;

        _settingsStore.Save(Settings);
        SetStatus("Configuracion guardada.");
        RestartMonitoring();
        return Task.CompletedTask;
    }

    public async Task TestLocalAlertAsync()
    {
        var sample = new SupportRequestRecord
        {
            Id = Guid.NewGuid().ToString("N"),
            RequestedByName = "Prueba local",
            RequestedByRole = "Operador",
            Reason = "Alerta de prueba del agente de bandeja.",
            PendingCount = 12,
            Status = "pendiente",
            Source = "local-test",
            CreatedAt = DateTimeOffset.UtcNow,
        };

        await HandleSupportRequestAsync(sample);
    }

    private void RestartMonitoring()
    {
        var previous = _monitorCts;
        _monitorCts = new CancellationTokenSource();

        try
        {
            previous.Cancel();
        }
        catch
        {
            // Ignore cancellation errors during restart.
        }

        _ = Task.Run(() => RunMonitorAsync(_monitorCts.Token));
    }

    private async Task RunMonitorAsync(CancellationToken cancellationToken)
    {
        var monitor = new SupportRequestMonitor(
            () => Settings,
            _api,
            HandleSupportRequestAsync,
            HandleSupportRequestClosedAsync,
            SetStatus);

        await monitor.RunAsync(cancellationToken);
    }

    private async Task HandleSupportRequestAsync(SupportRequestRecord record)
    {
        if (string.IsNullOrWhiteSpace(record?.Id))
        {
            return;
        }

        var shouldShow = false;

        await _gate.WaitAsync();
        try
        {
            if (_activeRequestIds.Add(record.Id!))
            {
                _pendingQueue.Enqueue(record);
                shouldShow = true;
            }
        }
        finally
        {
            _gate.Release();
        }

        if (!shouldShow)
        {
            return;
        }

        Dispatcher.UIThread.Post(() => _ = ShowNextAlertAsync());
    }

    private async Task HandleSupportRequestClosedAsync(string requestId)
    {
        if (string.IsNullOrWhiteSpace(requestId))
        {
            return;
        }

        if (_currentAlertWindow != null &&
            string.Equals(_currentAlertWindow.RequestId, requestId, StringComparison.OrdinalIgnoreCase) &&
            _currentAlertWindow.IsWaitingForAutoClose &&
            !_currentAlertWindow.HasTimedOut)
        {
            return;
        }

        await _gate.WaitAsync();
        try
        {
            _activeRequestIds.Remove(requestId);

            var remaining = new Queue<SupportRequestRecord>();
            while (_pendingQueue.Count > 0)
            {
                var item = _pendingQueue.Dequeue();
                if (!string.Equals(item.Id, requestId, StringComparison.OrdinalIgnoreCase))
                {
                    remaining.Enqueue(item);
                }
            }

            while (remaining.Count > 0)
            {
                _pendingQueue.Enqueue(remaining.Dequeue());
            }
        }
        finally
        {
            _gate.Release();
        }

        Dispatcher.UIThread.Post(() =>
        {
            if (_currentAlertWindow != null &&
                string.Equals(_currentAlertWindow.RequestId, requestId, StringComparison.OrdinalIgnoreCase))
            {
                _currentAlertWindow.Close();
                _currentAlertWindow = null;
            }

            _ = ShowNextAlertAsync();
        });
    }

    private async Task ShowNextAlertAsync()
    {
        if (_currentAlertWindow != null)
        {
            return;
        }

        SupportRequestRecord? next = null;

        await _gate.WaitAsync();
        try
        {
            if (_pendingQueue.Count > 0)
            {
                next = _pendingQueue.Dequeue();
            }
        }
        finally
        {
            _gate.Release();
        }

        if (next == null)
        {
            return;
        }

        _currentAlertWindow = new SupportAlertWindow(this, next);
        _currentAlertWindow.Closed += (_, _) =>
        {
            _currentAlertWindow = null;
            Dispatcher.UIThread.Post(() => _ = ShowNextAlertAsync());
        };
        _currentAlertWindow.Show();
        _currentAlertWindow.Activate();
    }

    private void SetStatus(string status)
    {
        StatusText = status;
        _trayIcon?.UpdateTooltip(status);
    }

    public void ExitApp()
    {
        if (_mainWindow != null)
        {
            _mainWindow.AllowClose = true;
        }

        Dispose();
        Dispatcher.UIThread.Post(() => _desktop.Shutdown());
    }

    public void Dispose()
    {
        try
        {
            _monitorCts.Cancel();
        }
        catch
        {
            // Ignore cancellation errors during shutdown.
        }

        _trayIcon?.Dispose();
        _monitorCts.Dispose();
        _gate.Dispose();
    }
}
