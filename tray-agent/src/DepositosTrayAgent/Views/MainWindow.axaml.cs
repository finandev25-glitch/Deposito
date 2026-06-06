using Avalonia.Controls;
using Avalonia.Interactivity;
using DepositosTrayAgent.Models;

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
        FooterTextBlock.Text = "Backend: " + _controller.Settings.BackendBaseUrl;
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
        FooterTextBlock.Text = "Configuracion guardada.";
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
