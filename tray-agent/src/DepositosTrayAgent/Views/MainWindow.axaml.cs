using Avalonia.Controls;
using Avalonia;
using Avalonia.Interactivity;
using Avalonia.Input;
using DepositosTrayAgent.Models;
using WinFormsScreen = System.Windows.Forms.Screen;

namespace DepositosTrayAgent.Views;

public partial class MainWindow : Window
{
    private readonly TrayAppController _controller;
    public bool AllowClose { get; set; }

    public MainWindow(TrayAppController controller)
    {
        _controller = controller;
        InitializeComponent();
        Opened += MainWindow_Opened;
        Closing += MainWindow_Closing;
        Opened += (_, _) => DockToTaskbar();
        RootBorder.PointerPressed += RootBorder_PointerPressed;
        SaveButton.Click += SaveButton_Click;
        TestButton.Click += TestButton_Click;
        OpenDashboardButton.Click += OpenDashboardButton_Click;
    }

    private void MainWindow_Opened(object? sender, System.EventArgs e)
    {
        BackendUrlBox.Text = _controller.Settings.BackendBaseUrl;
        DashboardUrlBox.Text = _controller.Settings.DashboardUrl;
        AgentNameBox.Text = _controller.Settings.AgentName;
        AgentGroupBox.Text = _controller.Settings.AgentGroup;
        MachineAliasBox.Text = _controller.Settings.MachineAlias;
        StatusTextBlock.Text = _controller.StatusText;
    }

    private async void SaveButton_Click(object? sender, RoutedEventArgs e)
    {
        await _controller.SaveSettingsAsync(new AppSettings
        {
            BackendBaseUrl = BackendUrlBox.Text ?? string.Empty,
            DashboardUrl = DashboardUrlBox.Text ?? string.Empty,
            AgentName = AgentNameBox.Text ?? string.Empty,
            AgentGroup = AgentGroupBox.Text ?? string.Empty,
            MachineAlias = MachineAliasBox.Text ?? string.Empty,
        });

        StatusTextBlock.Text = _controller.StatusText;
    }

    private async void TestButton_Click(object? sender, RoutedEventArgs e)
    {
        await _controller.TestLocalAlertAsync();
        StatusTextBlock.Text = "Alerta local disparada.";
    }

    private void OpenDashboardButton_Click(object? sender, RoutedEventArgs e)
    {
        _controller.OpenDashboard();
    }

    private void DockToTaskbar()
    {
        if (!OperatingSystem.IsWindows())
        {
            return;
        }

        var screen = WinFormsScreen.PrimaryScreen;
        if (screen == null)
        {
            return;
        }

        var workingArea = screen.WorkingArea;
        const int bottomMargin = 12;
        const int leftMargin = 12;

        var targetHeight = Math.Max(186, (int)Math.Round(Height));
        var targetWidth = Math.Min(460, Math.Max(420, workingArea.Width / 4));
        var left = Math.Min(workingArea.Right - targetWidth, workingArea.Left + leftMargin);
        var top = Math.Max(workingArea.Top, workingArea.Bottom - targetHeight - bottomMargin);

        Width = targetWidth;
        Height = targetHeight;
        Position = new PixelPoint(left, top);
    }

    private void RootBorder_PointerPressed(object? sender, PointerPressedEventArgs e)
    {
        if (e.Source == RootBorder && e.GetCurrentPoint(this).Properties.IsLeftButtonPressed)
        {
            BeginMoveDrag(e);
        }
    }

    private void MainWindow_Closing(object? sender, WindowClosingEventArgs e)
    {
        if (AllowClose)
        {
            return;
        }

        e.Cancel = true;
        Hide();
    }
}
