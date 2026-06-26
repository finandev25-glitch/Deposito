using System.Diagnostics;
using System.IO.Compression;
using System.Security.Principal;
using System.Text;

namespace DepositosTrayAgentInstaller;

internal static class Program
{
    private const string AppFolderName = "DepositosTrayAgent";
    private const string ShortcutName = "Depositos Tray Agent";

    [STAThread]
    private static void Main(string[] args)
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        try
        {
            if (args.Any(a => string.Equals(a, "--uninstall", StringComparison.OrdinalIgnoreCase)))
            {
                Uninstall();
                return;
            }

            Install();
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                ex.Message,
                "Depositos Tray Agent",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }

    private static void Install()
    {
        var installDir = GetInstallDirectory();
        Directory.CreateDirectory(installDir);

        ExtractPayload(installDir);

        var exePath = Path.Combine(installDir, "DepositosTrayAgent.exe");
        if (!File.Exists(exePath))
        {
            throw new FileNotFoundException("No se encontró el ejecutable instalado.", exePath);
        }

        CreateShortcuts(exePath, installDir);

        Process.Start(new ProcessStartInfo
        {
            FileName = exePath,
            WorkingDirectory = installDir,
            UseShellExecute = true,
        });

        MessageBox.Show(
            "La aplicación se instaló correctamente.",
            "Depositos Tray Agent",
            MessageBoxButtons.OK,
            MessageBoxIcon.Information);
    }

    private static void Uninstall()
    {
        var installDir = GetInstallDirectory();
        RemoveShortcuts();

        if (Directory.Exists(installDir))
        {
            try
            {
                Directory.Delete(installDir, recursive: true);
            }
            catch
            {
                // Best-effort uninstall; ignore locked files.
            }
        }

        MessageBox.Show(
            "La aplicación fue desinstalada.",
            "Depositos Tray Agent",
            MessageBoxButtons.OK,
            MessageBoxIcon.Information);
    }

    private static string GetInstallDirectory()
    {
        return Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            AppFolderName);
    }

    private static void ExtractPayload(string installDir)
    {
        using var payloadStream = GetPayloadStream();
        using var archive = new ZipArchive(payloadStream, ZipArchiveMode.Read, leaveOpen: false);

        foreach (var entry in archive.Entries)
        {
            var destinationPath = Path.Combine(installDir, entry.FullName);
            var normalizedDestination = Path.GetFullPath(destinationPath);
            var normalizedRoot = Path.GetFullPath(installDir) + Path.DirectorySeparatorChar;

            if (!normalizedDestination.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }

            if (string.IsNullOrEmpty(entry.Name))
            {
                Directory.CreateDirectory(normalizedDestination);
                continue;
            }

            Directory.CreateDirectory(Path.GetDirectoryName(normalizedDestination)!);
            entry.ExtractToFile(normalizedDestination, overwrite: true);
        }
    }

    private static Stream GetPayloadStream()
    {
        var assembly = typeof(Program).Assembly;
        var stream = assembly.GetManifestResourceStream("payload.zip");
        if (stream == null)
        {
            throw new InvalidOperationException("No se encontró el paquete de la aplicación incrustado.");
        }

        return stream;
    }

    private static void CreateShortcuts(string exePath, string installDir)
    {
        var programsDir = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
        var desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);

        var startMenuShortcut = Path.Combine(programsDir, $"{ShortcutName}.lnk");
        var uninstallShortcut = Path.Combine(programsDir, $"{ShortcutName} - Desinstalar.lnk");
        var desktopShortcut = Path.Combine(desktopDir, $"{ShortcutName}.lnk");

        CreateShortcut(startMenuShortcut, exePath, string.Empty, installDir, "Depositos Tray Agent");
        CreateShortcut(uninstallShortcut, exePath, "--uninstall", installDir, "Desinstalar Depositos Tray Agent");
        CreateShortcut(desktopShortcut, exePath, string.Empty, installDir, "Depositos Tray Agent");
    }

    private static void RemoveShortcuts()
    {
        var programsDir = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
        var desktopDir = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);

        DeleteIfExists(Path.Combine(programsDir, $"{ShortcutName}.lnk"));
        DeleteIfExists(Path.Combine(programsDir, $"{ShortcutName} - Desinstalar.lnk"));
        DeleteIfExists(Path.Combine(desktopDir, $"{ShortcutName}.lnk"));
    }

    private static void DeleteIfExists(string path)
    {
        try
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
        catch
        {
            // Ignore shortcut cleanup failures.
        }
    }

    private static void CreateShortcut(
        string linkPath,
        string targetPath,
        string arguments,
        string workingDirectory,
        string description)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(linkPath)!);

        var shellType = Type.GetTypeFromProgID("WScript.Shell");
        if (shellType == null)
        {
            throw new InvalidOperationException("No se pudo crear el acceso directo.");
        }

        dynamic shell = Activator.CreateInstance(shellType)!;
        dynamic shortcut = shell.CreateShortcut(linkPath);
        shortcut.TargetPath = targetPath;
        shortcut.WorkingDirectory = workingDirectory;
        shortcut.Arguments = arguments;
        shortcut.Description = description;
        shortcut.IconLocation = targetPath;
        shortcut.Save();
    }
}
