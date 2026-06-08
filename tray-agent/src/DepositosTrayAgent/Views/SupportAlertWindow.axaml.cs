using System;
using Avalonia;
using Avalonia.Controls;
using Avalonia.Interactivity;
using Avalonia.Media;
using Avalonia.Threading;
using DepositosTrayAgent.Models;

namespace DepositosTrayAgent.Views;

public partial class SupportAlertWindow : Window
{
    private readonly TrayAppController _controller;
    private readonly SupportRequestRecord _request;
    private readonly DispatcherTimer _flashTimer;
    private readonly DispatcherTimer _autoCloseTimer;
    private readonly DispatcherTimer _shakeTimer;
    private bool _flashToggle;
    private PixelPoint _restingPosition;
    private int _shakeStep;

    public string? RequestId { get; }

    public SupportAlertWindow(TrayAppController controller, SupportRequestRecord request)
    {
        _controller = controller;
        _request = request;
        RequestId = request.Id;
        InitializeComponent();

        ReasonText.Text = BuildReasonText(request);
        OpenDashboardButton.Click += async (_, _) =>
        {
            if (await _controller.AcknowledgeAndOpenDashboardAsync(_request))
            {
                Close();
            }
        };
        DismissButton.Click += async (_, _) =>
        {
            if (await _controller.ExpireSupportRequestAsync(_request))
            {
                Close();
            }
        };

        _flashTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromMilliseconds(450),
        };
        _flashTimer.Tick += (_, _) => ToggleFlash();
        _flashTimer.Start();

        _autoCloseTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(8),
        };
        _autoCloseTimer.Tick += (_, _) =>
        {
            _autoCloseTimer.Stop();
            Close();
            _ = _controller.ExpireSupportRequestAsync(_request);
        };
        _autoCloseTimer.Start();

        _shakeTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromMilliseconds(22),
        };
        _shakeTimer.Tick += (_, _) => ShakeWindow();

        Opened += (_, _) => PositionAsNotification();
        Closed += (_, _) =>
        {
            _flashTimer.Stop();
            _autoCloseTimer.Stop();
            _shakeTimer.Stop();
        };
    }

    private void PositionAsNotification()
    {
        var screen = Screens.Primary;
        if (screen == null)
        {
            return;
        }

        var workingArea = screen.WorkingArea;
        var screenBounds = screen.Bounds;
        var taskbarThickness = screenBounds.Height - workingArea.Height;
        if (taskbarThickness <= 0)
        {
            taskbarThickness = 40;
        }

        var width = Math.Min((int)Math.Round(Width), Math.Max(320, workingArea.Width / 3));
        var height = Math.Max((int)Math.Round(Height), taskbarThickness);
        var left = screenBounds.Right - width;
        var top = screenBounds.Bottom - height;

        Width = width;
        Height = height;
        _restingPosition = new PixelPoint(left, top);
        Position = _restingPosition;

        _shakeStep = 0;
        _shakeTimer.Start();
    }

    private void ToggleFlash()
    {
        _flashToggle = !_flashToggle;
        RootBorder.Background = new SolidColorBrush(Avalonia.Media.Color.Parse(_flashToggle ? "#EF4444" : "#B91C1C"));
        ReasonText.Opacity = 1.0;
        ReasonText.Foreground = new SolidColorBrush(Avalonia.Media.Color.Parse(_flashToggle ? "#111111" : "#FFFFFF"));
    }

    private void ShakeWindow()
    {
        const int amplitude = 10;
        const int cycles = 10;

        if (_shakeStep >= cycles)
        {
            _shakeTimer.Stop();
            Position = _restingPosition;
            return;
        }

        var offset = (_shakeStep % 2 == 0) ? amplitude : -amplitude;
        Position = new PixelPoint(_restingPosition.X + offset, _restingPosition.Y);
        _shakeStep++;
    }

    private static string BuildReasonText(SupportRequestRecord request)
    {
        var reason = (request.Reason ?? "Sin motivo").Trim();
        var source = request.Source?.Trim().ToLowerInvariant();
        var isAutomatic = source is "automatic" or "auto" or "polling";

        if (TryStripAutomaticPrefix(ref reason))
        {
            isAutomatic = true;
        }

        reason = reason.Trim();
        if (string.IsNullOrWhiteSpace(reason))
        {
            reason = "Sin motivo";
        }

        if (isAutomatic && reason.Length > 70)
        {
            reason = reason[..67].TrimEnd() + "...";
        }

        return reason;
    }

    private static bool TryStripAutomaticPrefix(ref string reason)
    {
        var prefixes = new[]
        {
            "Alerta automatica:",
            "Alerta automática:",
            "Alerta automatica -",
            "Alerta automática -",
        };

        foreach (var prefix in prefixes)
        {
            if (!reason.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            reason = reason[prefix.Length..].TrimStart(' ', ':', '-', '–');
            return true;
        }

        return false;
    }
}
