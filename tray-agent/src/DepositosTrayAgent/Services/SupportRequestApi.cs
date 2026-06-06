using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using DepositosTrayAgent.Models;

namespace DepositosTrayAgent.Services;

public sealed class SupportRequestApi
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
    };

    private readonly HttpClient _httpClient;

    public SupportRequestApi(HttpClient? httpClient = null)
    {
        _httpClient = httpClient ?? new HttpClient
        {
            Timeout = Timeout.InfiniteTimeSpan,
        };
    }

    public async Task<IReadOnlyList<SupportRequestRecord>> FetchPendingAsync(AppSettings settings, CancellationToken cancellationToken = default)
    {
        var url = BuildUrl(settings, "/api/support-requests?status=pendiente&limit=100");
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();

        var payload = await response.Content.ReadAsStringAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(payload))
        {
            return Array.Empty<SupportRequestRecord>();
        }

        using var document = JsonDocument.Parse(payload);
        if (!document.RootElement.TryGetProperty("data", out var dataElement) || dataElement.ValueKind != JsonValueKind.Array)
        {
            return Array.Empty<SupportRequestRecord>();
        }

        var items = new List<SupportRequestRecord>();
        foreach (var item in dataElement.EnumerateArray())
        {
            var record = item.Deserialize<SupportRequestRecord>(JsonOptions);
            if (record != null)
            {
                items.Add(record);
            }
        }

        return items;
    }

    public async IAsyncEnumerable<SupportRequestEventEnvelope> ListenAsync(
        AppSettings settings,
        [System.Runtime.CompilerServices.EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var url = BuildUrl(settings, "/api/events/support-requests");
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("text/event-stream"));

        using var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        response.EnsureSuccessStatusCode();

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var reader = new StreamReader(stream, Encoding.UTF8);

        string? currentEventName = null;
        var currentData = new StringBuilder();

        while (!reader.EndOfStream && !cancellationToken.IsCancellationRequested)
        {
            var line = await reader.ReadLineAsync();
            if (line == null)
            {
                break;
            }

            if (line.Length == 0)
            {
                if (currentData.Length > 0)
                {
                    var json = currentData.ToString();
                    SupportRequestEventEnvelope? envelope = null;
                    try
                    {
                        envelope = JsonSerializer.Deserialize<SupportRequestEventEnvelope>(json, JsonOptions);
                    }
                    catch
                    {
                        envelope = null;
                    }

                    if (envelope != null)
                    {
                        if (string.IsNullOrWhiteSpace(envelope.EventType) && !string.IsNullOrWhiteSpace(currentEventName))
                        {
                            envelope.EventType = currentEventName;
                        }

                        yield return envelope;
                    }
                }

                currentEventName = null;
                currentData.Clear();
                continue;
            }

            if (line.StartsWith("event:", StringComparison.OrdinalIgnoreCase))
            {
                currentEventName = line["event:".Length..].Trim();
                continue;
            }

            if (line.StartsWith("data:", StringComparison.OrdinalIgnoreCase))
            {
                if (currentData.Length > 0)
                {
                    currentData.Append('\n');
                }

                currentData.Append(line["data:".Length..].TrimStart());
            }
        }
    }

    public async Task<bool> AcknowledgeAsync(AppSettings settings, string requestId, string acknowledgedBy, CancellationToken cancellationToken = default)
    {
        var url = BuildUrl(settings, $"/api/support-requests/{Uri.EscapeDataString(requestId)}");
        var payload = JsonSerializer.Serialize(new
        {
            status = "atendido",
            acknowledged_by = acknowledgedBy,
            acknowledged_at = DateTimeOffset.UtcNow,
            resolved_by = acknowledgedBy,
            resolved_at = DateTimeOffset.UtcNow,
            notes = "Reconocido desde la app de bandeja",
        }, JsonOptions);

        using var request = new HttpRequestMessage(HttpMethod.Patch, url)
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json"),
        };

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return true;
    }

    public async Task<bool> ExpireAsync(AppSettings settings, string requestId, CancellationToken cancellationToken = default)
    {
        var url = BuildUrl(settings, $"/api/support-requests/{Uri.EscapeDataString(requestId)}");
        var payload = JsonSerializer.Serialize(new
        {
            status = "vencido",
            resolved_at = DateTimeOffset.UtcNow,
            notes = "Vencido por expiración en la app de bandeja",
        }, JsonOptions);

        using var request = new HttpRequestMessage(HttpMethod.Patch, url)
        {
            Content = new StringContent(payload, Encoding.UTF8, "application/json"),
        };

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        response.EnsureSuccessStatusCode();
        return true;
    }

    private static string BuildUrl(AppSettings settings, string path)
    {
        var baseUrl = NormalizeBaseUrl(settings.BackendBaseUrl);
        var normalizedPath = path.StartsWith("/") ? path : "/" + path;
        return string.IsNullOrWhiteSpace(baseUrl) ? normalizedPath : $"{baseUrl}{normalizedPath}";
    }

    private static string NormalizeBaseUrl(string? value)
    {
        var text = string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();
        if (string.IsNullOrWhiteSpace(text))
        {
            return string.Empty;
        }

        return text.EndsWith("/") ? text[..^1] : text;
    }
}
