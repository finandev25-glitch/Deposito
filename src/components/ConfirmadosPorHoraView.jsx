import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { buildApiUrl } from "../services/apiBase.js";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Loader2,
  TrendingUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PERIOD_OPTIONS = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

const TIME_SOURCE_OPTIONS = [
  { value: "validacion", label: "Hora de confirmación" },
  { value: "registro", label: "Hora de recepción" },
];

function formatHourLabel(hour) {
  const normalizedHour = ((hour % 24) + 24) % 24;
  const period = normalizedHour < 12 ? "AM" : "PM";
  const displayHour = normalizedHour % 12 || 12;
  return `${displayHour} ${period}`;
}

const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => formatHourLabel(hour));
const DISPLAY_HOURS = Array.from({ length: 12 }, (_, index) => index + 8);
const MAX_USER_SEGMENTS = 5;
const OTHER_KEY = "__otros__";
const OTHER_LABEL = "Otros";
const USER_PALETTE = [
  "#1d4ed8",
  "#7c3aed",
  "#0891b2",
  "#ea580c",
  "#dc2626",
  "#0f766e",
  "#be185d",
  "#4338ca",
  "#059669",
];

const toneMap = {
  empty: "#cbd5e1",
  low: "#60a5fa",
  medium: "#f59e0b",
  high: "#ef4444",
  peak: "#b91c1c",
};

function getPeriodFetchValue(period) {
  if (period === "today") return "today";
  if (period === "week") return "week";
  if (period === "month") return "month";
  return "today";
}

function getHourFromDate(value) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const formatter = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const hourPart = parts.find((part) => part.type === "hour");
  const hour = Number(hourPart?.value);

  return Number.isFinite(hour) ? hour : null;
}

function normalizeUserLabel(deposit) {
  return String(
    deposit?.validado_por_usuario?.nombre ||
      deposit?.validado_por_nombre ||
      deposit?.validado_por ||
      "Sin asignar",
  ).trim() || "Sin asignar";
}

function getSegmentColor(index, isOther = false) {
  if (isOther) return "#94a3b8";
  return USER_PALETTE[index % USER_PALETTE.length];
}

function formatDisplayDate(dateValue) {
  if (!dateValue) return "";

  return new Intl.DateTimeFormat("es-PE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateValue}T00:00:00`));
}

export default function ConfirmadosPorHoraView() {
  const [period, setPeriod] = useState("today");
  const [timeSource, setTimeSource] = useState("validacion");
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  useEffect(() => {
    const controller = new AbortController();

    const loadDeposits = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("limit", "2000");

        if (selectedDate) {
          params.set("date", selectedDate);
        } else {
          params.set("period", getPeriodFetchValue(period));
        }

        const response = await fetch(buildApiUrl(`/api/depositos?${params.toString()}`), {
          signal: controller.signal,
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "No se pudieron cargar los depositos");
        }

        const payload = await response.json();
        setRows(Array.isArray(payload.data) ? payload.data : []);
      } catch (fetchError) {
        if (fetchError.name === "AbortError") return;
        console.error("Error cargando confirmados por hora:", fetchError);
        setError(fetchError.message || "No se pudieron cargar los depositos");
      } finally {
        setLoading(false);
      }
    };

    loadDeposits();

    return () => controller.abort();
  }, [period, selectedDate]);

  const analytics = useMemo(() => {
    const confirmedRows = rows.filter((deposit) => {
      const estado = String(deposit?.estado || "").toLowerCase().trim();
      const hasValidationDate = !!deposit?.fecha_validacion;
      return estado === "validado" || hasValidationDate;
    });

    const sourceField = timeSource === "registro" ? "fecha_registro" : "fecha_validacion";
    const confirmedItems = confirmedRows
      .map((deposit) => {
        const hour = getHourFromDate(
          deposit?.[sourceField] || deposit?.fecha_validacion || deposit?.fecha_registro,
        );
        if (hour === null || hour < 0 || hour > 23) return null;
        return {
          hour,
          userLabel: normalizeUserLabel(deposit),
        };
      })
      .filter(Boolean);

    const userTotals = new Map();
    confirmedItems.forEach((item) => {
      userTotals.set(item.userLabel, (userTotals.get(item.userLabel) || 0) + 1);
    });

    const topUsers = [...userTotals.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es"))
      .slice(0, MAX_USER_SEGMENTS)
      .map(([label], index) => ({
        key: `user_${index}`,
        label,
        color: getSegmentColor(index),
        total: userTotals.get(label) || 0,
      }));

    const userLookup = new Map(topUsers.map((user) => [user.label, user]));

    const selectedSeries = Array.from({ length: 24 }, (_, hour) => {
      const base = {
        hour,
        label: HOUR_LABELS[hour],
        count: 0,
        suggested_support: 0,
        [OTHER_KEY]: 0,
      };

      topUsers.forEach((user) => {
        base[user.key] = 0;
      });

      return base;
    });

    confirmedItems.forEach((item) => {
      const bucket = selectedSeries[item.hour];
      if (!bucket) return;

      bucket.count += 1;
      const matchedUser = userLookup.get(item.userLabel);
      if (matchedUser) {
        bucket[matchedUser.key] += 1;
      } else {
        bucket[OTHER_KEY] += 1;
      }
    });

    selectedSeries.forEach((bucket) => {
      bucket.suggested_support = bucket.count > 0 ? Math.max(1, Math.ceil(bucket.count / 3)) : 0;
    });

    const peakBucket = [...selectedSeries]
      .filter((bucket) => DISPLAY_HOURS.includes(bucket.hour))
      .filter((bucket) => bucket.count > 0)
      .sort((a, b) => b.count - a.count || a.hour - b.hour)[0] || null;

    const totalConfirmed = confirmedRows.length;
    const averagePerHour = Number((totalConfirmed / 24).toFixed(2));
    const activeHours = selectedSeries.filter((bucket) => bucket.count > 0).length;
    const criticalHours = selectedSeries.filter((bucket) => bucket.count >= 3).length;
    const totalSuggestedSupport = peakBucket ? peakBucket.suggested_support : 0;

    return {
      confirmedRows,
      selectedSeries,
      peakBucket,
      topUsers,
      totalConfirmed,
      averagePerHour,
      activeHours,
      criticalHours,
      totalSuggestedSupport,
    };
  }, [rows, timeSource]);

  const chartData = useMemo(() => {
    return analytics.selectedSeries
      .filter((bucket) => DISPLAY_HOURS.includes(bucket.hour))
      .map((bucket) => ({ ...bucket }));
  }, [analytics.selectedSeries, analytics.peakBucket]);

  const emptyState = !loading && !error && analytics.totalConfirmed === 0;

  return (
    <div className="min-h-screen bg-slate-50 p-6 dark:bg-slate-900">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700 dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-200">
            <CheckCircle2 size={14} />
            Confirmados por hora
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">
            Confirmados por Hora
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Revisa en qué horas se confirman más depósitos, entre las 08:00 y las 19:00, para organizar mejor al personal de apoyo.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Fecha
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-sm text-slate-900 outline-none transition focus:border-green-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
              {selectedDate && (
                <button
                  type="button"
                  onClick={() => setSelectedDate("")}
                  className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:text-white"
                >
                  Limpiar
                </button>
              )}
            </div>
            {selectedDate && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {formatDisplayDate(selectedDate)}
              </p>
            )}

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => {
              const active = period === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => {
                    setSelectedDate("");
                    setPeriod(option.value);
                  }}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    active
                      ? "bg-slate-900 text-white shadow-lg dark:bg-white dark:text-slate-900"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />

            <div className="flex flex-wrap gap-2">
            {TIME_SOURCE_OPTIONS.map((option) => {
              const active = timeSource === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => setTimeSource(option.value)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                    active
                      ? "bg-green-600 text-white shadow-lg"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800">
          <Loader2 size={48} className="animate-spin text-green-500" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          <div className="flex items-center gap-3">
            <AlertTriangle size={22} />
            <div>
              <p className="font-semibold">No se pudo cargar el analisis de depósitos</p>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_0.95fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-800">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Distribución por hora
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Cada barra representa la cantidad de depósitos confirmados en esa hora, dentro de la franja 08:00 a 19:00.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
                  Zona horaria: America/Lima | 08:00 - 19:00
                </div>
              </div>

              {emptyState ? (
                <div className="flex h-80 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-900/40">
                  <div>
                    <Clock3 size={42} className="mx-auto mb-3 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      No hay depósitos confirmados en el periodo seleccionado.
                    </p>
                  </div>
                </div>
                  ) : (
                    <>
                      {analytics.topUsers.length > 0 && (
                        <div className="mb-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-800">
                      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Leyenda de colores
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {analytics.topUsers.map((user) => (
                          <div
                            key={user.key}
                            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-md"
                            style={{ backgroundColor: user.color }}
                          >
                            <span>{user.label}</span>
                            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                              {user.total}
                            </span>
                          </div>
                        ))}
                        {analytics.confirmedRows.length > analytics.topUsers.reduce((sum, user) => sum + user.total, 0) && (
                          <div className="inline-flex items-center gap-2 rounded-full bg-slate-500 px-3 py-1.5 text-xs font-semibold text-white shadow-md">
                            <span>Otros</span>
                            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                              {analytics.confirmedRows.length - analytics.topUsers.reduce((sum, user) => sum + user.total, 0)}
                            </span>
                          </div>
                        )}
                          </div>
                        </div>
                      )}

                  <div className="relative min-h-[595px]">
                    <ResponsiveContainer width="100%" height={552}>
                      <BarChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis
                          dataKey="label"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748b", fontSize: 12 }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#64748b", fontSize: 12 }}
                        />
                        <Tooltip
                          shared={false}
                          cursor={{ fill: "rgba(15, 23, 42, 0.06)" }}
                          content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;

                            const segment = payload[0];
                            if (!segment) return null;

                            const segmentKey = String(segment?.dataKey || "");
                            const label =
                              segmentKey === OTHER_KEY
                                ? OTHER_LABEL
                                : analytics.topUsers.find((user) => user.key === segmentKey)?.label ||
                                  segmentKey;
                            const count = Number(segment?.value || 0);

                            if (!count) return null;

                            return (
                              <div className="rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
                                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                                  {label}
                                </p>
                                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                  {count} dep&oacute;sitos
                                </p>
                              </div>
                            );
                          }}
                        />
                        {analytics.topUsers.map((user) => (
                          <Bar
                            key={user.key}
                            dataKey={user.key}
                            stackId="confirmed"
                            fill={user.color}
                            radius={user.key === analytics.topUsers[analytics.topUsers.length - 1]?.key ? [10, 10, 0, 0] : [0, 0, 0, 0]}
                            isAnimationActive={false}
                          />
                        ))}
                        {chartData.some((item) => Number(item[OTHER_KEY] || 0) > 0) && (
                          <Bar
                            dataKey={OTHER_KEY}
                            stackId="confirmed"
                            fill="#94a3b8"
                            radius={[10, 10, 0, 0]}
                            isAnimationActive={false}
                          />
                        )}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white shadow-sm dark:border-slate-800">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white/10 p-3">
                    <TrendingUp size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Regla operativa</h3>
                    <p className="mt-1 text-sm text-slate-300">
                      Para ordenar el apoyo, usa la franja con mayor confirmación y asigna una persona por cada 3 confirmados en esa hora.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
