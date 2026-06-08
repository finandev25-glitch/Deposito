using System;
using System.Threading;
using System.Threading.Tasks;
using DepositosTrayAgent.Models;

namespace DepositosTrayAgent.Services;

public sealed class SupportRequestMonitor
{
    private static readonly TimeZoneInfo LimaTimeZone = ResolveLimaTimeZone();

    private readonly Func<AppSettings> _getSettings;
    private readonly SupportRequestApi _api;
    private readonly Func<SupportRequestRecord, Task> _onSupportRequest;
    private readonly Func<string, Task> _onSupportRequestClosed;
    private readonly Action<string> _onStatusChanged;

    public SupportRequestMonitor(
        Func<AppSettings> getSettings,
        SupportRequestApi api,
        Func<SupportRequestRecord, Task> onSupportRequest,
        Func<string, Task> onSupportRequestClosed,
        Action<string> onStatusChanged)
    {
        _getSettings = getSettings;
        _api = api;
        _onSupportRequest = onSupportRequest;
        _onSupportRequestClosed = onSupportRequestClosed;
        _onStatusChanged = onStatusChanged;
    }

    public async Task RunAsync(CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            var settings = _getSettings();
            if (string.IsNullOrWhiteSpace(settings.BackendBaseUrl))
            {
                _onStatusChanged("Configura la URL del backend.");
                await DelayAsync(TimeSpan.FromSeconds(5), cancellationToken);
                continue;
            }

            try
            {
                _onStatusChanged("Consultando solicitudes pendientes...");
                await ProcessPendingRequestsAsync(settings, cancellationToken);

                _onStatusChanged("Escuchando nuevas solicitudes de apoyo...");
                using var pollingCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
                var pollingTask = PollPendingRequestsAsync(settings, pollingCts.Token);

                try
                {
                    await foreach (var envelope in _api.ListenAsync(settings, cancellationToken))
                    {
                        var current = envelope.New ?? envelope.Old;
                        if (current?.Id == null)
                        {
                            continue;
                        }

                        var eventType = string.IsNullOrWhiteSpace(envelope.EventType)
                            ? string.Empty
                            : envelope.EventType.Trim().ToUpperInvariant();

                        var status = current.Status?.Trim().ToLowerInvariant();

                        if (eventType == "INSERT")
                        {
                            if (IsTodayPending(current) && status == "pendiente")
                            {
                                await _onSupportRequest(current);
                            }
                        }
                        else if (eventType == "UPDATE")
                        {
                            if (IsTodayPending(current) && status == "pendiente")
                            {
                                await _onSupportRequest(current);
                            }
                            else
                            {
                                await _onSupportRequestClosed(current.Id);
                            }
                        }
                    }
                }
                finally
                {
                    pollingCts.Cancel();
                    try
                    {
                        await pollingTask;
                    }
                    catch
                    {
                        // Ignore polling shutdown errors during reconnect.
                    }
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _onStatusChanged($"Desconectado: {ex.Message}");
                await DelayAsync(TimeSpan.FromSeconds(5), cancellationToken);
            }
        }
    }

    private async Task PollPendingRequestsAsync(AppSettings settings, CancellationToken cancellationToken)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            await DelayAsync(TimeSpan.FromSeconds(15), cancellationToken);

            if (cancellationToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                _onStatusChanged("Revisando solicitudes pendientes...");
                await ProcessPendingRequestsAsync(settings, cancellationToken);
                _onStatusChanged("Escuchando nuevas solicitudes de apoyo...");
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _onStatusChanged($"Desconectado: {ex.Message}");
            }
        }
    }

    private async Task ProcessPendingRequestsAsync(AppSettings settings, CancellationToken cancellationToken)
    {
        var pendingRequests = await _api.FetchPendingAsync(settings, cancellationToken);
        foreach (var request in pendingRequests)
        {
            if (request?.Id == null)
            {
                continue;
            }

            if (!IsTodayPending(request))
            {
                continue;
            }

            await _onSupportRequest(request);
        }
    }

    private static Task DelayAsync(TimeSpan delay, CancellationToken cancellationToken)
    {
        return Task.Delay(delay, cancellationToken);
    }

    private static bool IsTodayPending(SupportRequestRecord? record)
    {
        if (record == null)
        {
            return false;
        }

        var status = record.Status?.Trim().ToLowerInvariant();
        if (status != "pendiente")
        {
            return false;
        }

        if (IsManualRecord(record))
        {
            return true;
        }

        if (record.CreatedAt == null)
        {
            return false;
        }

        var createdAtLima = TimeZoneInfo.ConvertTime(record.CreatedAt.Value, LimaTimeZone);
        var todayLima = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, LimaTimeZone).Date;
        return createdAtLima.Date == todayLima;
    }

    private static bool IsManualRecord(SupportRequestRecord record)
    {
        var source = record.Source?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(source))
        {
            return false;
        }

        return source is "manual"
            or "manually"
            or "manual-entry"
            or "manual_entry"
            or "backoffice"
            or "db"
            or "tabla";
    }

    private static TimeZoneInfo ResolveLimaTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("SA Pacific Standard Time");
        }
        catch
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById("America/Lima");
            }
            catch
            {
                return TimeZoneInfo.Utc;
            }
        }
    }
}
