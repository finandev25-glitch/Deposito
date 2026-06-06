using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using AvaloniaApp = Avalonia.Application;

namespace DepositosTrayAgent;

public partial class App : AvaloniaApp
{
    public TrayAppController? Controller { get; private set; }

    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            Controller = new TrayAppController(desktop);
            _ = Controller.InitializeAsync();
        }

        base.OnFrameworkInitializationCompleted();
    }
}
