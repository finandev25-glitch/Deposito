import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  Calendar,
  Download,
  Loader2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";
import { apiBlob, apiGet, apiPost } from "../services/backendApi.js";

const STORAGE_KEY = "exportar_vouchers_filters";

function readStoredFilters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeStoredFilters(filters) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch {
    // noop
  }
}

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}

function statusBadgeClass(status) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "processing":
    case "queued":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "error":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

function statusIcon(status, className = "h-4 w-4") {
  switch (status) {
    case "completed":
      return <CheckCircle2 className={className} />;
    case "processing":
    case "queued":
      return <Loader2 className={`${className} animate-spin`} />;
    case "error":
      return <XCircle className={className} />;
    default:
      return <Clock3 className={className} />;
  }
}

function summarizeFilters(filters) {
  if (!filters) return "-";
  const parts = [];
  parts.push(filters.exportMode === "date" ? "Fecha específica" : "Mes");
  if (filters.exportMode === "date" && filters.specificDate) {
    parts.push(filters.specificDate);
  }
  if (filters.exportMode === "month" && filters.selectedMonth) {
    parts.push(filters.selectedMonth);
  }
  if (filters.filterStatus && filters.filterStatus !== "all") {
    parts.push(`Estado ${filters.filterStatus}`);
  }
  return parts.join(" · ");
}

export default function ExportarVouchersView() {
  const savedFilters = useMemo(() => readStoredFilters() || {}, []);
  const initialJobsLoadedRef = useRef(false);
  const [exportMode, setExportMode] = useState(savedFilters.exportMode || "month");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (savedFilters.selectedMonth) return savedFilters.selectedMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [specificDate, setSpecificDate] = useState(savedFilters.specificDate || "");
  const [filterStatus, setFilterStatus] = useState(savedFilters.filterStatus || "all");
  const [currentJob, setCurrentJob] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Aún no has generado una solicitud.");
  const [loadingJobs, setLoadingJobs] = useState(false);

  const refreshJobs = async () => {
    setLoadingJobs(true);
    try {
      const response = await apiGet("/documents/vouchers/export-jobs?limit=25");
      setJobs(response?.data || []);
    } catch (error) {
      setJobs([]);
      setStatusMessage(
        error?.status === 500
          ? "El historial de solicitudes aún no está disponible. La exportación igual puede continuar."
          : error.message || "No se pudo cargar la tabla de solicitudes."
      );
    } finally {
      setLoadingJobs(false);
    }
  };

  useEffect(() => {
    writeStoredFilters({
      exportMode,
      selectedMonth,
      specificDate,
      filterStatus,
    });
  }, [exportMode, selectedMonth, specificDate, filterStatus]);

  useEffect(() => {
    if (initialJobsLoadedRef.current) return;
    initialJobsLoadedRef.current = true;
    refreshJobs();
  }, []);

  useEffect(() => {
    if (!currentJob?.id || !["queued", "processing"].includes(currentJob.status)) return undefined;

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const response = await apiGet(`/documents/vouchers/export-job/${currentJob.id}`);
        if (cancelled) return;
        const snapshot = response?.data || null;
        if (snapshot) {
          setCurrentJob(snapshot);
          setJobs((prev) => {
            const next = prev.filter((item) => String(item.id) !== String(snapshot.id));
            return [snapshot, ...next].slice(0, 25);
          });
          setStatusMessage(
            snapshot.status === "completed"
              ? "La exportación ya está lista."
              : snapshot.status === "error"
                ? "La exportación terminó con errores."
                : `Procesando... ${snapshot.processed || 0} / ${snapshot.total || 0}`
          );
        }
      } catch (error) {
        if (!cancelled) {
          setStatusMessage(error.message || "No se pudo consultar la solicitud.");
        }
      }
    }, 1500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [currentJob?.id, currentJob?.status]);

  const startExport = async () => {
    setIsStarting(true);
    setStatusMessage("Creando solicitud de exportación...");

    try {
      const payload =
        exportMode === "date"
          ? {
              exportMode,
              specificDate,
              filterStatus,
            }
          : {
              exportMode,
              filterPeriod: "month",
              selectedMonth,
              filterStatus,
            };

      const response = await apiPost("/documents/vouchers/export-job", payload);

      const nextJob = response?.data || null;
      setCurrentJob(nextJob);
      if (nextJob) {
        setJobs((prev) => {
          const next = prev.filter((item) => String(item.id) !== String(nextJob.id));
          return [nextJob, ...next].slice(0, 25);
        });
      }
      setStatusMessage("Solicitud creada. El backend ya está procesando los vouchers.");
    } catch (error) {
      setStatusMessage(error.message || "No se pudo iniciar la exportación.");
    } finally {
      setIsStarting(false);
    }
  };

  const downloadZip = async (jobId) => {
    if (!jobId) return;
    setIsDownloading(true);
    try {
      const blob = await apiBlob(`/documents/vouchers/export-job/${jobId}/download`);
      if (!blob || blob.size === 0) {
        throw new Error("El ZIP está vacío.");
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "vouchers_depositos.zip";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setStatusMessage(error.message || "No se pudo descargar el ZIP.");
    } finally {
      setIsDownloading(false);
    }
  };

  const progress = currentJob?.progress || 0;
  const jobFailures = currentJob?.failures || [];

  return (
    <div className="h-full p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              <Archive className="h-3.5 w-3.5" />
              Exportación de vouchers
            </div>
            <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
              Solicitudes registradas
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Genera solicitudes por mes o por fecha específica y revisa el historial de exportaciones.
            </p>
          </div>

          <button
            onClick={startExport}
            disabled={isStarting || currentJob?.status === "processing" || currentJob?.status === "queued"}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400"
          >
            {isStarting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            {isStarting ? "Iniciando..." : "Generar solicitud"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <button
            onClick={() => setExportMode("month")}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              exportMode === "month"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Modo</p>
            <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">Mes</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Exporta por un mes completo.</p>
          </button>
          <button
            onClick={() => setExportMode("date")}
            className={`rounded-2xl border p-4 text-left transition-colors ${
              exportMode === "date"
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
            }`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Modo</p>
            <p className="mt-2 text-lg font-bold text-gray-900 dark:text-gray-100">Fecha específica</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Exporta solo un día exacto.</p>
          </button>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Estado</p>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
            >
              <option value="all">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_validacion">En validación</option>
              <option value="validado">Validado</option>
              <option value="rechazado">Rechazado</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {exportMode === "month" ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Mes</p>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha específica</p>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="mt-3 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
              />
            </div>
          )}

          <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Solicitud actual
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{statusMessage}</p>
              </div>
              <button
                onClick={refreshJobs}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar tabla
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Progreso</p>
                  <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                    {currentJob ? `${currentJob.processed || 0} / ${currentJob.total || 0} procesados` : "Sin solicitud activa"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{progress}%</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{currentJob?.filesAdded || 0} archivos listos</p>
                </div>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
                <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  onClick={() => downloadZip(currentJob?.id)}
                  disabled={!currentJob || currentJob.status !== "completed" || isDownloading}
                  className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:bg-green-300"
                >
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Descargar ZIP
                </button>
                {currentJob?.status === "error" && (
                  <span className="inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    <AlertTriangle className="h-4 w-4" />
                    Error en la solicitud
                  </span>
                )}
              </div>

              {currentJob?.zipPath && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  ZIP guardado en Supabase Storage: <span className="font-mono">{currentJob.zipPath}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {jobFailures.length > 0 && (
          <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900/40 dark:bg-yellow-900/15">
            <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300">
              <AlertTriangle className="h-4 w-4" />
              <p className="text-sm font-semibold">Vouchers con fallo: {jobFailures.length}</p>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 px-4 py-3 dark:border-gray-800">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Tabla de solicitudes registradas
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
              <thead className="bg-gray-50 dark:bg-gray-950/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Filtros</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Progreso</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {loadingJobs && jobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      Cargando solicitudes...
                    </td>
                  </tr>
                ) : jobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                      No hay solicitudes registradas todavía.
                    </td>
                  </tr>
                ) : (
                  jobs.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-950/40">
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        <div className="font-medium text-gray-900 dark:text-gray-100">{formatDateTime(item.createdAt)}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">ID: {item.id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {summarizeFilters(item.filters)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(item.status)}`}>
                          {statusIcon(item.status, "h-3.5 w-3.5")}
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                        {item.progress || 0}% ({item.processed || 0}/{item.total || 0})
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setCurrentJob(item)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
