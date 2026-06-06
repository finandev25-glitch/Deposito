using System.Text.Json.Serialization;

namespace DepositosTrayAgent.Models;

public sealed class SupportRequestEventEnvelope
{
    [JsonPropertyName("type")]
    public string? Type { get; set; }

    [JsonPropertyName("eventType")]
    public string? EventType { get; set; }

    [JsonPropertyName("new")]
    public SupportRequestRecord? New { get; set; }

    [JsonPropertyName("old")]
    public SupportRequestRecord? Old { get; set; }

    [JsonPropertyName("meta")]
    public object? Meta { get; set; }

    [JsonPropertyName("timestamp")]
    public string? Timestamp { get; set; }
}
