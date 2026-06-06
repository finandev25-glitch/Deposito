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
    private bool _flashToggle;

    public string? RequestId { get; }

    public SupportAlertWindow(TrayAppController controller, SupportRequestRecord request)
    {
        _controller = controller;
        _request = request;
        RequestId = request.Id;
        InitializeComponent();

        ReasonText.Text = request.Reason ?? "Sin motivo";
        OpenDashboardButton.Click += async (_, _) =>
        {
            if (await _controller.AcknowledgeAndOpenDashboardAsync(_request))
            {
                Close();
            }
        };
        DismissButton.Click += (_, _) => Close();

        _flashTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromMilliseconds(450),
        };
        _flashTimer.Tick += (_, _) => ToggleFlash();
        _flashTimer.Start();

        _autoCloseTimer = new DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(15),
        };
        _autoCloseTimer.Tick += (_, _) =>
        {
            _autoCloseTimer.Stop();
            Close();
            _ = _controller.ExpireSupportRequestAsync(_request);
        };
        _autoCloseTimer.Start();

        Opened += (_, _) => PositionAsNotification();
        Closed += (_, _) =>
        {
            _flashTimer.Stop();
            _autoCloseTimer.Stop();
        };
    }

    private void PositionAsNotification()
    {
        var screen = Screens.Primary;
        if (screen == null)
        {
            return;
        }

        const int margin = 24;
        var workingArea = screen.WorkingArea;
        var x = workingArea.X + workingArea.Width - (int)Math.Round(Bounds.Width) - margin;
        var y = workingArea.Y + workingArea.Height - (int)Math.Round(Bounds.Height) - margin;

        Position = new PixelPoint(Math.Max(workingArea.X + margin, x), Math.Max(workingArea.Y + margin, y));
    }

    private void ToggleFlash()
    {
        _flashToggle = !_flashToggle;
        RootBorder.Background = new SolidColorBrush(Avalonia.Media.Color.Parse(_flashToggle ? "#EF4444" : "#B91C1C"));
    }
}
