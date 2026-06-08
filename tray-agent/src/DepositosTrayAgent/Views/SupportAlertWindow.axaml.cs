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
    private static readonly TimeSpan AutoCloseDuration = TimeSpan.FromSeconds(15);
    private readonly TrayAppController _controller;
    private readonly SupportRequestRecord _request;
    private readonly DispatcherTimer _flashTimer;
    private readonly DispatcherTimer _autoCloseTimer;
    private readonly DispatcherTimer _shakeTimer;
    private bool _flashToggle;
    private bool _isTimedOut;
    private bool _countdownStarted;
    private PixelPoint _restingPosition;
    private int _shakeStep;
    private DateTimeOffset _closeAtUtc;

    public string? RequestId { get; }
    public bool IsWaitingForAutoClose => _countdownStarted && !_isTimedOut;
    public bool HasTimedOut => _isTimedOut;

    public SupportAlertWindow(TrayAppController controller, SupportRequestRecord request)
    {
        _controller = controller;
        _request = request;
        RequestId = request.Id;
        InitializeComponent();

        ReasonText.Text = BuildReasonText(request);
        TitleText.Text = "URGENTE!!";
        CountdownText.Text = "Se cierra en 15 segundos";
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
            Interval = TimeSpan.FromMilliseconds(250),
        };
        _autoCloseTimer.Tick += (_, _) =>
        {
            TickAutoCloseCountdown();
        };

        _shakeTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromMilliseconds(22),
        };
        _shakeTimer.Tick += (_, _) => ShakeWindow();

        Opened += (_, _) =>
        {
            PositionAsNotification();
            StartAutoCloseCountdown();
        };
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

        const int leftMargin = 12;
        const int bottomMargin = 12;

        var width = Math.Min((int)Math.Round(Width), Math.Max(360, workingArea.Width / 5));
        var height = Math.Max((int)Math.Round(Height), taskbarThickness);
        var left = workingArea.X + leftMargin;
        var top = Math.Max(workingArea.Y, workingArea.Bottom - height - bottomMargin);

        Width = width;
        Height = height;
        _restingPosition = new PixelPoint(left, top);
        Position = _restingPosition;

        _shakeStep = 0;
        _shakeTimer.Start();
    }

    private void StartAutoCloseCountdown()
    {
        if (_countdownStarted)
        {
            return;
        }

        _countdownStarted = true;
        _isTimedOut = false;
        _closeAtUtc = DateTimeOffset.UtcNow.Add(AutoCloseDuration);
        UpdateCountdownText();
        _autoCloseTimer.Start();
    }

    private async void TickAutoCloseCountdown()
    {
        if (_isTimedOut)
        {
            return;
        }

        var remaining = _closeAtUtc - DateTimeOffset.UtcNow;
        if (remaining > TimeSpan.Zero)
        {
            UpdateCountdownText(remaining);
            return;
        }

        _isTimedOut = true;
        _autoCloseTimer.Stop();
        CountdownText.Text = "Vencida";
        CountdownText.Foreground = new SolidColorBrush(Avalonia.Media.Color.Parse("#FCA5A5"));
        RootBorder.Background = new SolidColorBrush(Avalonia.Media.Color.Parse("#7F1D1D"));

        if (await _controller.ExpireSupportRequestAsync(_request))
        {
            Close();
        }
    }

    private void UpdateCountdownText(TimeSpan? remainingOverride = null)
    {
        var remaining = remainingOverride ?? (_closeAtUtc - DateTimeOffset.UtcNow);
        var seconds = Math.Max(1, (int)Math.Ceiling(remaining.TotalSeconds));
        CountdownText.Text = $"Se cierra en {seconds} segundos";
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
        const int cycles = 18;

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
