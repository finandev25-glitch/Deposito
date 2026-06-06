using System;
using System.IO;
using System.Text.Json;
using DepositosTrayAgent.Models;

namespace DepositosTrayAgent.Services;

public sealed class SettingsStore
{
    private const string OldBackendBaseUrl = "https://deposito.gnfcio.easypanel.host";
    private const string OldDashboardUrl = "https://deposito.gnfcio.easypanel.host/kanban";
    private const string DefaultBackendBaseUrl = "http://192.168.85.50:3000";
    private const string DefaultDashboardUrl = "http://192.168.85.50:3000/kanban";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
    };

    public string SettingsDirectory { get; } =
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "DepositosTrayAgent");

    public string SettingsPath => Path.Combine(SettingsDirectory, "settings.json");

    public AppSettings Load()
    {
        try
        {
            if (!File.Exists(SettingsPath))
            {
                return new AppSettings();
            }

            var json = File.ReadAllText(SettingsPath);
            var settings = JsonSerializer.Deserialize<AppSettings>(json, JsonOptions) ?? new AppSettings();

            if (string.IsNullOrWhiteSpace(settings.BackendBaseUrl) ||
                string.Equals(settings.BackendBaseUrl.Trim(), OldBackendBaseUrl, StringComparison.OrdinalIgnoreCase))
            {
                settings.BackendBaseUrl = DefaultBackendBaseUrl;
            }

            if (string.IsNullOrWhiteSpace(settings.DashboardUrl) ||
                string.Equals(settings.DashboardUrl.Trim(), OldDashboardUrl, StringComparison.OrdinalIgnoreCase))
            {
                settings.DashboardUrl = DefaultDashboardUrl;
            }

            return settings;
        }
        catch
        {
            return new AppSettings();
        }
    }

    public void Save(AppSettings settings)
    {
        Directory.CreateDirectory(SettingsDirectory);
        var json = JsonSerializer.Serialize(settings, JsonOptions);
        File.WriteAllText(SettingsPath, json);
    }
}
