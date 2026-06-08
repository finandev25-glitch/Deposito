using System;
using System.Text.Json.Serialization;

namespace DepositosTrayAgent.Models;

public sealed class SupportRequestRecord
{
    [JsonPropertyName("id")]
    public string? Id { get; set; }

    [JsonPropertyName("requested_by_id")]
    public string? RequestedById { get; set; }

    [JsonPropertyName("requested_by_name")]
    public string? RequestedByName { get; set; }

    [JsonPropertyName("requested_by_role")]
    public string? RequestedByRole { get; set; }

    [JsonPropertyName("reason")]
    public string? Reason { get; set; }

    [JsonPropertyName("pending_count")]
    public int PendingCount { get; set; }

    [JsonPropertyName("status")]
    public string? Status { get; set; }

    [JsonPropertyName("source")]
    public string? Source { get; set; }

    [JsonPropertyName("deposit_id")]
    public string? DepositId { get; set; }

    [JsonPropertyName("acknowledged_by")]
    public string? AcknowledgedBy { get; set; }

    [JsonPropertyName("acknowledged_at")]
    public DateTimeOffset? AcknowledgedAt { get; set; }

    [JsonPropertyName("resolved_by")]
    public string? ResolvedBy { get; set; }

    [JsonPropertyName("resolved_at")]
    public DateTimeOffset? ResolvedAt { get; set; }

    [JsonPropertyName("notes")]
    public string? Notes { get; set; }

    [JsonPropertyName("created_at")]
    public DateTimeOffset? CreatedAt { get; set; }

    [JsonPropertyName("updated_at")]
    public DateTimeOffset? UpdatedAt { get; set; }
}
