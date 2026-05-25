import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { finished } from "stream/promises";
import JSZip from "jszip";

let supabaseClient = null;
let channel = null;
let realtimeStatus = "DISCONNECTED";
let reconnectTimeout = null;
const clients = new Set();
const voucherExportJobs = new Map();
let envLoaded = false;
const QUERY_LOGGING_ENABLED = process.env.LOG_QUERIES !== "false";
const YCLOUD_API_BASE_URL = "https://api.ycloud.com/v2";
const YCLOUD_SEND_URL = `${YCLOUD_API_BASE_URL}/whatsapp/messages/sendDirectly`;
const YCLOUD_MESSAGES_URL = `${YCLOUD_API_BASE_URL}/whatsapp/messages`;
const YCLOUD_BALANCE_URL = `${YCLOUD_API_BASE_URL}/balance`;

function getAllowedOrigin(req) {
  const origin = req.headers.origin;
  const configuredOrigin = process.env.CORS_ORIGIN;

  if (configuredOrigin) {
    return configuredOrigin;
  }

  if (origin) {
    return origin;
  }

  return "*";
}

function queryPreview(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return { rows: value.length };
  if (typeof value === "object") {
    const summary = {};
    for (const [key, entry] of Object.entries(value)) {
      if (key === "data" && Array.isArray(entry)) {
        summary.rows = entry.length;
      } else if (key === "error" && entry) {
        summary.error = entry.message || String(entry);
      } else if (["count", "status", "statusText"].includes(key)) {
        summary[key] = entry;
      }
    }
    return summary;
  }
  return value;
}

function redactSensitiveBody(body) {
  if (!body || typeof body !== "object") {
    return body;
  }

  const clone = Array.isArray(body) ? [...body] : { ...body };
  for (const key of ["api_key", "access_token", "token", "authorization"]) {
    if (key in clone) {
      clone[key] = "[redacted]";
    }
  }
  return clone;
}

function extractGoogleDriveFileId(value) {
  if (!value) return null;

  const text = String(value);
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/d\/([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
}

function buildVoucherFetchCandidates(sourceUrl) {
  const url = String(sourceUrl || "").trim();
  if (!url) return [];

  const candidates = [];
  const driveFileId = extractGoogleDriveFileId(url);

  if (driveFileId) {
    candidates.push(`https://drive.google.com/uc?export=download&id=${driveFileId}`);
    candidates.push(`https://drive.usercontent.google.com/download?id=${driveFileId}&export=download&authuser=0`);
    candidates.push(`https://drive.google.com/uc?export=view&id=${driveFileId}`);
    candidates.push(`https://drive.google.com/file/d/${driveFileId}/preview`);
  }

  candidates.push(url);
  return [...new Set(candidates)];
}

function extractGoogleDriveConfirmUrl(html, fallbackFileId) {
  const text = String(html || "");
  const patterns = [
    /href="([^"]*\/uc\?export=download[^"]+)"/i,
    /href='([^']*\/uc\?export=download[^']+)'/i,
    /window\.location\.href\s*=\s*"([^"]*\/uc\?export=download[^"]+)"/i,
    /window\.location\.href\s*=\s*'([^']*\/uc\?export=download[^']+)'/i,
    /confirm=([a-zA-Z0-9_-]+)/i,
  ];

  let confirmToken = null;
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      if (match[1].includes("/uc?export=download")) {
        return match[1].replace(/&amp;/g, "&");
      }
      if (pattern.source.includes("confirm=")) {
        confirmToken = match[1];
      }
    }
  }

  if (confirmToken && fallbackFileId) {
    return `https://drive.google.com/uc?export=download&confirm=${confirmToken}&id=${fallbackFileId}`;
  }

  return null;
}

function sanitizeFilenamePart(value, fallback = "voucher") {
  const text = String(value || fallback).trim();
  const sanitized = text.replace(/[\/\\?%*:|"<>]/g, "_").replace(/\s+/g, "_");
  return sanitized || fallback;
}

function formatDateForDisplay(value) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function buildDepositSearchBlob(deposit) {
  return [
    deposit?.empresa?.nombre,
    deposit?.sucursal?.nombre,
    deposit?.trabajador?.nombre,
    deposit?.anexo,
    deposit?.monto != null ? String(deposit.monto) : "",
    deposit?.numero_operacion,
    deposit?.estado ? String(deposit.estado).replaceAll("_", " ") : "",
    deposit?.ruc_cliente,
    formatDateForDisplay(deposit?.fecha_deposito),
    formatDateForDisplay(deposit?.fecha_registro),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function chunkArray(values, chunkSize = 100) {
  const chunks = [];
  if (!Array.isArray(values) || values.length === 0) return chunks;

  for (let index = 0; index < values.length; index += chunkSize) {
    chunks.push(values.slice(index, index + chunkSize));
  }

  return chunks;
}

function resolveVoucherExportPeriod({ exportMode, specificDate, filterPeriod, selectedMonth }) {
  if (exportMode === "date") {
    return { date: specificDate || null, period: null };
  }

  if (exportMode === "month") {
    const now = new Date();
    const monthValue = selectedMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return { date: null, period: `month:${monthValue}` };
  }

  if (specificDate) {
    return { date: specificDate, period: null };
  }

  if (filterPeriod === "month") {
    const now = new Date();
    const monthValue = selectedMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return { date: null, period: `month:${monthValue}` };
  }

  if (filterPeriod && filterPeriod !== "all") {
    return { date: null, period: filterPeriod };
  }

  return { date: null, period: null };
}

function inferVoucherExtension(contentType, sourceUrl) {
  const type = String(contentType || "").toLowerCase();
  if (type.includes("pdf")) return "pdf";
  if (type.includes("png")) return "png";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";

  const urlExtMatch = String(sourceUrl || "").match(/\.([a-zA-Z0-9]+)(?:[?#]|$)/);
  if (urlExtMatch?.[1]) {
    return urlExtMatch[1].toLowerCase().replace("jpeg", "jpg");
  }

  return "bin";
}

function createVoucherExportJobSnapshot(job) {
  if (!job) return null;

  return {
    id: job.id,
    status: job.status,
    progress: job.progress,
    total: job.total,
    processed: job.processed,
    filesAdded: job.filesAdded,
    failures: job.failures,
    error: job.error,
    filters: job.filters || null,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    completedAt: job.completedAt,
    zipSizeBytes: job.zipSizeBytes || null,
    zipFilename: job.zipFilename || null,
    createdBy: job.createdBy || null,
  };
}

async function fetchVoucherExportJobRow(jobId) {
  return voucherExportJobs.get(jobId) || null;
}

async function fetchVoucherExportJobRows(limit = 25) {
  return Array.from(voucherExportJobs.values())
    .map(createVoucherExportJobSnapshot)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit)
    .filter(Boolean);
}

function toNodeReadable(body) {
  if (!body) return null;
  if (typeof body.pipe === "function") return body;
  if (typeof body.getReader === "function") return Readable.fromWeb(body);
  return null;
}

async function fetchVoucherReadableStream(sourceUrl) {
  const candidates = buildVoucherFetchCandidates(sourceUrl);
  let lastError = null;
  const driveFileId = extractGoogleDriveFileId(sourceUrl);

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        method: "GET",
        redirect: "follow",
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} al descargar voucher`);
        continue;
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const isHtml = contentType.toLowerCase().includes("text/html");

      if (isHtml) {
        const html = await response.text();
        const confirmUrl = extractGoogleDriveConfirmUrl(html, driveFileId);
        if (confirmUrl && confirmUrl !== candidate) {
          const confirmResponse = await fetch(confirmUrl, {
            method: "GET",
            redirect: "follow",
          });

          if (confirmResponse.ok) {
            const confirmContentType = confirmResponse.headers.get("content-type") || "application/octet-stream";
            const confirmStream = toNodeReadable(confirmResponse.body);
            if (confirmStream) {
              return {
                stream: confirmStream,
                contentType: confirmContentType,
                sourceUrl: confirmUrl,
              };
            }
          }
        }

        lastError = new Error(`Respuesta HTML no descargable desde ${candidate}`);
        continue;
      }

      const stream = toNodeReadable(response.body);
      if (!stream) {
        const buffer = Buffer.from(await response.arrayBuffer());
        return {
          stream: Readable.from(buffer),
          contentType,
          sourceUrl: candidate,
        };
      }

      return {
        stream,
        contentType,
        sourceUrl: candidate,
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("No se pudo descargar el voucher");
}

async function queueVoucherExportJob(filters, createdBy = null) {
  const jobId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const queuedJob = {
    id: jobId,
    status: "queued",
    progress: 0,
    total: 0,
    processed: 0,
    filesAdded: 0,
    failures: [],
    error: null,
    filters: {
      ids: Array.isArray(filters?.ids) ? filters.ids : [],
      exportMode: filters?.exportMode || null,
      specificDate: filters?.specificDate || null,
      filterPeriod: filters?.filterPeriod || "all",
      selectedMonth: filters?.selectedMonth || null,
      searchTerm: filters?.searchTerm || "",
      filterStatus: filters?.filterStatus || "all",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    zipSizeBytes: null,
    zipFilename: "vouchers_depositos.zip",
    createdBy,
  };

  voucherExportJobs.set(jobId, queuedJob);

  console.info("[API] voucher export job queued", {
    jobId,
    filterSummary: {
      exportMode: queuedJob.filters.exportMode,
      filterPeriod: queuedJob.filters.filterPeriod,
      selectedMonth: queuedJob.filters.selectedMonth,
      specificDate: queuedJob.filters.specificDate,
      filterStatus: queuedJob.filters.filterStatus,
    },
  });

  setImmediate(() => {
    void runVoucherExportJob(jobId, queuedJob.filters).catch((error) => {
      console.error("[API] ERROR voucher export job run", {
        jobId,
        message: error.message,
      });
    });
  });
  return queuedJob;
}

function updateVoucherExportJob(jobId, patch) {
  const job = voucherExportJobs.get(jobId);
  if (!job) return null;
  Object.assign(job, patch, { updatedAt: new Date().toISOString() });
  voucherExportJobs.set(jobId, job);
  return job;
}

function getVoucherExportProgress(vouchersLength, processed) {
  if (!vouchersLength) return 100;
  return Math.min(92, 5 + Math.round((processed / vouchersLength) * 87));
}

async function exportVouchersToZip(vouchers, { jobId = null } = {}) {
  const failures = [];
  let filesAdded = 0;
  let processed = 0;
  const totalVouchers = vouchers.length || 0;
  const progressStep = totalVouchers <= 25 ? 1 : totalVouchers <= 100 ? 5 : totalVouchers <= 1000 ? 25 : 100;
  let nextProgressLog = progressStep;
  let lastCompletedItem = null;
  const zip = new JSZip();

  console.info("[API] Voucher export started", {
    total: totalVouchers,
    progressStep,
    inMemory: true,
  });

  const downloadTasks = vouchers.map(async (deposit) => {
    try {
      const binary = await fetchVoucherBinary(deposit.imagen_voucher);
      return {
        ok: true,
        deposit,
        ...binary,
      };
    } catch (error) {
      return {
        ok: false,
        deposit,
        error,
      };
    }
  });

  const settledDownloads = await Promise.all(downloadTasks);

  for (const result of settledDownloads) {
    processed += 1;

    if (result.ok) {
      const { deposit, buffer, contentType, sourceUrl } = result;
      const formattedDate = deposit.fecha_registro || deposit.fecha_deposito
        ? String(deposit.fecha_registro || deposit.fecha_deposito).split("T")[0]
        : "sin-fecha";
      const sucursalFolder = sanitizeFilenamePart(deposit.sucursal?.nombre, "sin-sucursal");
      const extension = inferVoucherExtension(contentType, sourceUrl || deposit.imagen_voucher);
      const opNumber = sanitizeFilenamePart(deposit.numero_operacion, `op_${deposit.id}`);
      const filename = `op_${opNumber}_id_${sanitizeFilenamePart(deposit.id, "id")}.${extension}`;
      const entryPath = `${formattedDate}/${sucursalFolder}/${filename}`;

      zip.file(entryPath, buffer);
      filesAdded += 1;
      lastCompletedItem = {
        id: deposit.id,
        numero_operacion: deposit.numero_operacion,
        sucursal: deposit.sucursal?.nombre || null,
        sourceUrl,
        filename,
      };
    } else {
      failures.push({
        id: result.deposit.id,
        numero_operacion: result.deposit.numero_operacion,
        error: result.error?.message || "No se pudo descargar el voucher",
      });
      console.error("[API] Voucher export item failed", {
        id: result.deposit.id,
        numero_operacion: result.deposit.numero_operacion,
        error: result.error?.message || "No se pudo descargar el voucher",
      });
    }

    if (processed >= nextProgressLog || processed === totalVouchers) {
      console.info("[API] Voucher export progress", {
        processed,
        total: totalVouchers,
        filesAdded,
        failures: failures.length,
        progress: getVoucherExportProgress(totalVouchers, processed),
        lastCompletedItem,
      });
      while (nextProgressLog <= processed) {
        nextProgressLog += progressStep;
      }
    }

    if (jobId) {
      updateVoucherExportJob(jobId, {
        processed,
        filesAdded,
        failures,
        progress: getVoucherExportProgress(vouchers.length, processed),
      });
    }
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 9 } });
  const zipSizeBytes = zipBuffer.length;

  console.info("[API] Voucher export finished", {
    total: totalVouchers,
    processed,
    filesAdded,
    failures: failures.length,
    zipSizeBytes,
  });

  return { zipBuffer, zipSizeBytes, filesAdded, failures, processed };
}

async function fetchVoucherBinary(sourceUrl) {
  const candidates = buildVoucherFetchCandidates(sourceUrl);
  let lastError = null;
  const driveFileId = extractGoogleDriveFileId(sourceUrl);

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        method: "GET",
        redirect: "follow",
      });

      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} al descargar voucher`);
        continue;
      }

      const contentType = response.headers.get("content-type") || "application/octet-stream";
      const isHtml = contentType.toLowerCase().includes("text/html");

      if (isHtml) {
        const html = await response.text();
        const confirmUrl = extractGoogleDriveConfirmUrl(html, driveFileId);
        if (confirmUrl && confirmUrl !== candidate) {
          const confirmResponse = await fetch(confirmUrl, {
            method: "GET",
            redirect: "follow",
          });

          if (confirmResponse.ok) {
            const confirmContentType = confirmResponse.headers.get("content-type") || "application/octet-stream";
            const confirmBuffer = Buffer.from(await confirmResponse.arrayBuffer());
            return {
              buffer: confirmBuffer,
              contentType: confirmContentType,
              sourceUrl: confirmUrl,
            };
          }
        }

        if (candidate !== candidates[candidates.length - 1]) {
          lastError = new Error(`Respuesta HTML no descargable desde ${candidate}`);
          continue;
        }
      }

      const arrayBuffer = isHtml ? Buffer.from(html || "", "utf8") : Buffer.from(await response.arrayBuffer());
      return {
        buffer: arrayBuffer,
        contentType,
        sourceUrl: candidate,
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("No se pudo descargar el voucher");
}

async function fetchDepositsForVoucherExport(filters = {}) {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase no estÃ¡ configurado en el backend");
  }

  const { ids, exportMode, specificDate, filterPeriod, selectedMonth, searchTerm, filterStatus } = filters;
  const search = String(searchTerm || "").trim().toLowerCase();
  const status = String(filterStatus || "all").trim();

  if (Array.isArray(ids) && ids.length > 0) {
    const uniqueIds = [...new Set(ids.map((value) => String(value).trim()).filter(Boolean))];
    const chunks = chunkArray(uniqueIds, 100);
    const results = [];

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const chunkQuery = client
        .from("depositos")
        .select(
          `id, numero_operacion, cliente, monto, fecha_registro, fecha_solo_date, imagen_voucher, anexo, numero_operacion_banco, fecha_deposito, estado, observaciones, motivo_rechazo, fecha_validacion, referencia_cliente, validado_por, moneda, ruc_cliente, telefono_origen, es_antiguo,
  empresa:empresa_id (id, nombre, estado, abreviatura),
  banco:banco_id (id, abreviatura, estado),
  sucursal:sucursal_id (id, nombre),
  trabajador:trabajador_sucursal_id (id, nombre, telefono_origen),
  validado_por_usuario:validado_por (id, nombre)`
        )
        .in("id", chunk)
        .order("fecha_registro", { ascending: false });

      const { data, error } = await runLoggedQuery(
        "depositos.byIds.chunk",
        { chunkIndex: index, chunkSize: chunk.length, totalIds: uniqueIds.length },
        () => chunkQuery
      );

      if (error) throw new Error(error.message);
      if (Array.isArray(data) && data.length > 0) {
        results.push(...data);
      }
    }

    results.sort((a, b) => {
      const aTime = new Date(a.fecha_registro || a.fecha_solo_date || 0).getTime();
      const bTime = new Date(b.fecha_registro || b.fecha_solo_date || 0).getTime();
      return bTime - aTime;
    });

    return results;
  }

  const { date, period } = resolveVoucherExportPeriod({
    exportMode,
    specificDate,
    filterPeriod,
    selectedMonth,
  });

  let deposits = [];

  if (date || period) {
    deposits = await fetchDeposits({
      date: date || undefined,
      period: period || undefined,
      limit: 5000,
    });
  } else {
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await runLoggedQuery(
        "depositos.export.all.page",
        { page, from, to },
        () =>
          client
            .from("depositos")
            .select(
              `id, numero_operacion, cliente, monto, fecha_registro, fecha_solo_date, imagen_voucher, anexo, numero_operacion_banco, fecha_deposito, estado, observaciones, motivo_rechazo, fecha_validacion, referencia_cliente, validado_por, moneda, ruc_cliente, telefono_origen, es_antiguo,
  empresa:empresa_id (id, nombre, estado, abreviatura),
  banco:banco_id (id, abreviatura, estado),
  sucursal:sucursal_id (id, nombre),
  trabajador:trabajador_sucursal_id (id, nombre, telefono_origen),
  validado_por_usuario:validado_por (id, nombre)`
            )
            .order("fecha_registro", { ascending: false })
            .range(from, to)
      );

      if (error) throw new Error(error.message);
      deposits = deposits.concat(data || []);
      hasMore = Array.isArray(data) && data.length === pageSize;
      page += 1;
      if (page >= 50) hasMore = false;
    }
  }

  let filtered = deposits.filter((deposit) => deposit.imagen_voucher);

  if (status !== "all") {
    filtered = filtered.filter((deposit) => String(deposit.estado || "") === status);
  }

  if (search) {
    filtered = filtered.filter((deposit) => buildDepositSearchBlob(deposit).includes(search));
  }

  return filtered;
}

async function runVoucherExportJob(jobId, filters) {
  const job = updateVoucherExportJob(jobId, {
    status: "processing",
    progress: 1,
    error: null,
    failures: [],
    processed: 0,
    filesAdded: 0,
    total: 0,
  });

  let exportResult = null;
  try {
    const deposits = await fetchDepositsForVoucherExport(filters);

    const vouchers = (deposits || []).filter((deposit) => deposit.imagen_voucher);
    updateVoucherExportJob(jobId, {
      total: vouchers.length,
      progress: vouchers.length === 0 ? 100 : 5,
    });

    exportResult = await exportVouchersToZip(vouchers, {
      jobId,
    });
    const { zipSizeBytes, filesAdded, failures } = exportResult;

    if (filesAdded === 0) {
      updateVoucherExportJob(jobId, {
        status: "error",
        progress: 100,
        error: "No se pudo descargar ningÃºn voucher para exportar",
        failures,
        completedAt: new Date().toISOString(),
      });
      return;
    }

    updateVoucherExportJob(jobId, { progress: 95 });
    updateVoucherExportJob(jobId, {
      status: "completed",
      progress: 100,
      filesAdded,
      failures,
      zipBuffer: exportResult.zipBuffer,
      zipSizeBytes: zipSizeBytes || exportResult.zipBuffer.length,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] ERROR export job", { jobId, message: error.message, stack: error.stack });
    updateVoucherExportJob(jobId, {
      status: "error",
      progress: 100,
      error: error.message,
      completedAt: new Date().toISOString(),
    });
  } finally {}
}

async function runLoggedQuery(label, details, executor) {
  const startedAt = Date.now();
  if (QUERY_LOGGING_ENABLED) {
    console.log(`[DB] START ${label}`, details || {});
  }

  try {
    const result = await executor();
    if (QUERY_LOGGING_ENABLED) {
      console.log(`[DB] OK ${label} (${Date.now() - startedAt}ms)`, queryPreview(result));
    }
    return result;
  } catch (error) {
    if (QUERY_LOGGING_ENABLED) {
      console.error(`[DB] ERROR ${label} (${Date.now() - startedAt}ms)`, error?.message || error);
    }
    throw error;
  }
}

function registerRequestLogger(app) {
  app.use("/api", (req, res, next) => {
    if (!QUERY_LOGGING_ENABLED) {
      next();
      return;
    }

    const startedAt = Date.now();
    const payload = {
      method: req.method,
      path: req.originalUrl,
      query: req.query,
      body: redactSensitiveBody(req.body),
    };

    console.log(`[API] ${req.method} ${req.originalUrl}`, payload);

    res.on("finish", () => {
      console.log(
        `[API] DONE ${req.method} ${req.originalUrl} ${res.statusCode} (${Date.now() - startedAt}ms)`
      );
    });

    next();
  });
}

function registerNoCacheHeaders(app) {
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });
}

function loadLocalEnv() {
  if (envLoaded) return;
  envLoaded = true;

  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function getEnv(name) {
  loadLocalEnv();
  return process.env[name] || process.env[`VITE_${name}`];
}

function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const url = getEnv("SUPABASE_URL");
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY") || getEnv("SUPABASE_ANON_KEY");

  if (!url || !key) return null;

  supabaseClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return supabaseClient;
}

function getSupabaseAuthClient() {
  const url = getEnv("SUPABASE_URL");
  const anonKey = getEnv("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;

  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function getSupabaseAdminClient() {
  return getSupabaseClient();
}

async function getAuthenticatedUserFromRequest(req) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    const error = new Error("Authorization token requerido");
    error.statusCode = 401;
    throw error;
  }

  const authClient = getSupabaseAuthClient();
  if (!authClient) {
    const error = new Error("Supabase no estÃ¡ configurado en el backend");
    error.statusCode = 503;
    throw error;
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error) {
    const authError = new Error(error.message || "No se pudo validar la sesiÃ³n");
    authError.statusCode = 401;
    throw authError;
  }

  const authUser = data?.user || null;
  if (!authUser) {
    const authError = new Error("SesiÃ³n invÃ¡lida");
    authError.statusCode = 401;
    throw authError;
  }

  const { data: profile, error: profileError } = await runLoggedQuery(
    "auth.user.profile",
    { userId: authUser.id },
    () => getSupabaseAdminClient().from("profiles").select("id, rol, estado, nombre, usuario, email").eq("id", authUser.id).maybeSingle()
  );

  if (profileError) {
    const authError = new Error(profileError.message || "No se pudo validar el perfil");
    authError.statusCode = 500;
    throw authError;
  }

  return {
    authUser,
    profile: profile || null,
    isAdmin: String(profile?.rol || "").toLowerCase() === "admin",
  };
}

async function fetchBootstrapData() {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase no estÃ¡ configurado en el backend");
  }

  const [bancosRes, empresasRes, cuentasRes, sucursalesRes, personalRes] =
    await Promise.all([
      runLoggedQuery("bootstrap.bancos", { table: "bancos" }, () =>
        client.from("bancos").select("*").order("nombre", { ascending: true })
      ),
      runLoggedQuery("bootstrap.empresas", { table: "empresas" }, () =>
        client.from("empresas").select("*").order("nombre", { ascending: true })
      ),
      runLoggedQuery("bootstrap.cuentas", { table: "cuentas_bancarias" }, () =>
        client
          .from("cuentas_bancarias")
          .select("*, empresa:empresas(*), banco:bancos(*)")
          .order("created_at", { ascending: false })
      ),
      runLoggedQuery("bootstrap.sucursales", { table: "sucursales" }, () =>
        client.from("sucursales").select("*").order("nombre", { ascending: true })
      ),
      runLoggedQuery("bootstrap.personal", { table: "sucursal_personal" }, () =>
        client.from("sucursal_personal").select("*")
      ),
    ]);

  const errors = [
    bancosRes.error && `Bancos: ${bancosRes.error.message}`,
    empresasRes.error && `Empresas: ${empresasRes.error.message}`,
    cuentasRes.error && `Cuentas: ${cuentasRes.error.message}`,
    sucursalesRes.error && `Sucursales: ${sucursalesRes.error.message}`,
    personalRes.error && `Personal: ${personalRes.error.message}`,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(errors.join(" | "));
  }

  return {
    bancos: bancosRes.data || [],
    empresas: empresasRes.data || [],
    cuentas: cuentasRes.data || [],
    sucursales: sucursalesRes.data || [],
    personal: personalRes.data || [],
  };
}

async function fetchActiveYCloudConfigs() {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase no estÃ¡ configurado en el backend");
  }

  const { data, error } = await runLoggedQuery(
    "ycloud.configs.list",
    {},
    () =>
      client
        .from("ycloud_config")
        .select("*")
        .order("activo", { ascending: false })
        .order("creado_en", { ascending: false })
  );

  if (error) throw new Error(error.message);
  return data || [];
}

function buildDocumentsVoucherSearchTerms(search) {
  const normalized = String(search || "").trim().toLowerCase();
  if (!normalized) return [];

  const variants = new Set([normalized]);
  const compact = normalized.replace(/\s+/g, "");
  if (compact) variants.add(compact);

  return [...variants];
}

function matchesDocumentVoucherSearch(deposit, searchTerms) {
  if (!searchTerms.length) return true;

  const montoText = deposit.monto != null ? String(deposit.monto) : "";
  const fechaText = deposit.fecha_deposito
    ? new Date(String(deposit.fecha_deposito).replace(/-/g, "/")).toLocaleDateString("es-ES")
    : "";
  const haystack = [
    deposit.numero_operacion,
    deposit.cliente,
    deposit.referencia_cliente,
    deposit.ruc_cliente,
    deposit.moneda,
    deposit.observaciones,
    deposit.sucursal?.nombre,
    deposit.banco?.abreviatura,
    deposit.empresa?.nombre,
    montoText,
    fechaText,
  ]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .join(" ");

  return searchTerms.some((term) => haystack.includes(term));
}

async function fetchDocumentsVoucherPage({ date, period, search, page = 1, pageSize = 12 }) {
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Math.min(100, Number(pageSize) || 12));
  const searchTerms = buildDocumentsVoucherSearchTerms(search);

  if (searchTerms.length > 0) {
    const deposits = await fetchDeposits({
      date,
      period,
      limit: 5000,
    });

    const vouchers = (deposits || []).filter((deposit) => deposit.imagen_voucher);
    const filtered = vouchers.filter((deposit) => matchesDocumentVoucherSearch(deposit, searchTerms));
    const total = filtered.length;
    const start = (safePage - 1) * safePageSize;
    const data = filtered.slice(start, start + safePageSize);

    return {
      data,
      total,
      page: safePage,
      pageSize: safePageSize,
      hasMore: start + safePageSize < total,
    };
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase no estÃƒÂ¡ configurado en el backend");
  }

  const selectFields = `id, numero_operacion, cliente, monto, fecha_registro, fecha_solo_date, imagen_voucher, anexo, numero_operacion_banco, fecha_deposito, estado, observaciones, motivo_rechazo, fecha_validacion, referencia_cliente, validado_por, moneda, ruc_cliente, telefono_origen, es_antiguo,
    empresa:empresa_id (id, nombre, estado, abreviatura),
    banco:banco_id (id, abreviatura, estado),
    sucursal:sucursal_id (id, nombre),
    trabajador:trabajador_sucursal_id (id, nombre, telefono_origen),
    validado_por_usuario:validado_por (id, nombre)`;

  let query = client
    .from("depositos")
    .select(selectFields, { count: "exact" })
    .not("imagen_voucher", "is", null)
    .neq("imagen_voucher", "");

  if (date) {
    query = query.eq("fecha_solo_date", date);
  } else if (period) {
    const now = new Date();
    if (period.startsWith("month:")) {
      const [year, month] = period.split(":")[1].split("-").map(Number);
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);
      query = query
        .gte("fecha_solo_date", startOfMonth.toISOString().split("T")[0])
        .lte("fecha_solo_date", endOfMonth.toISOString().split("T")[0]);
    } else {
      switch (period) {
        case "today":
          query = query.eq("fecha_solo_date", now.toISOString().split("T")[0]);
          break;
        case "week": {
          const dayOfWeek = now.getDay();
          const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - daysFromMonday);
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          query = query
            .gte("fecha_solo_date", startOfWeek.toISOString().split("T")[0])
            .lte("fecha_solo_date", endOfWeek.toISOString().split("T")[0]);
          break;
        }
        case "month": {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          query = query
            .gte("fecha_solo_date", startOfMonth.toISOString().split("T")[0])
            .lte("fecha_solo_date", endOfMonth.toISOString().split("T")[0]);
          break;
        }
        default:
          break;
      }
    }
  }

  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;
  const { data, error, count } = await runLoggedQuery(
    "documents.vouchers.page",
    { date, period, page: safePage, pageSize: safePageSize },
    () => query.order("fecha_registro", { ascending: false }).range(from, to)
  );

  if (error) throw new Error(error.message);

  return {
    data: data || [],
    total: count || 0,
    page: safePage,
    pageSize: safePageSize,
    hasMore: from + safePageSize < (count || 0),
  };
}

async function fetchYCloudConfigById(configId) {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase no estÃ¡ configurado en el backend");
  }

  const { data, error } = await runLoggedQuery(
    "ycloud.config.byId",
    { configId },
    () => client.from("ycloud_config").select("*").eq("id", configId).single()
  );

  if (error) throw new Error(error.message);
  return data;
}

function buildYCloudPayload(messageData, config) {
  const {
    to,
    from,
    type = "text",
    text,
    template,
    image,
    document,
    video,
    audio,
    location,
    interactive,
    context,
    filterUnsubscribed,
    externalId,
  } = messageData;

  const payload = {
    to,
    from: from || config.default_from_number,
    type,
  };

  switch (type) {
    case "text":
      if (!text || !text.body) throw new Error("text.body es requerido");
      payload.text = {
        body: text.body,
        previewUrl: text.previewUrl || false,
      };
      break;
    case "template":
      if (!template || !template.name) throw new Error("template.name es requerido");
      payload.template = {
        name: template.name,
        language: { code: template.language || "es" },
        components: template.components || [],
      };
      break;
    case "image":
      if (!image) throw new Error("image es requerido");
      payload.image = {
        link: image.link,
        caption: image.caption || undefined,
      };
      break;
    case "document":
      if (!document) throw new Error("document es requerido");
      payload.document = {
        link: document.link,
        filename: document.filename || undefined,
        caption: document.caption || undefined,
      };
      break;
    case "video":
      if (!video) throw new Error("video es requerido");
      payload.video = {
        link: video.link,
        caption: video.caption || undefined,
      };
      break;
    case "audio":
      if (!audio) throw new Error("audio es requerido");
      payload.audio = { link: audio.link };
      break;
    case "location":
      if (!location) throw new Error("location es requerido");
      payload.location = {
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name || undefined,
        address: location.address || undefined,
      };
      break;
    case "interactive":
      if (!interactive) throw new Error("interactive es requerido");
      payload.interactive = interactive;
      break;
    default:
      throw new Error(`Tipo de mensaje no soportado: ${type}`);
  }

  if (context) payload.context = context;
  if (filterUnsubscribed !== undefined) payload.filterUnsubscribed = filterUnsubscribed;
  if (externalId) payload.externalId = externalId;

  return payload;
}

async function sendYCloudMessage(messageData) {
  const configId = messageData.configId;
  if (!configId) {
    throw new Error("configId es requerido");
  }

  const config = await fetchYCloudConfigById(configId);
  if (!config || !config.activo) {
    throw new Error("ConfiguraciÃ³n YCloud no encontrada o inactiva");
  }

  const payload = buildYCloudPayload(messageData, config);
  const response = await fetch(YCLOUD_SEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": config.api_key,
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json();
  if (!response.ok) {
    throw new Error(
      `YCloud API Error ${response.status}: ${
        responseData.error?.message || response.statusText
      }`
    );
  }

  return responseData;
}

async function fetchWhatsAppCredentials() {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase no estÃ¡ configurado en el backend");
  }

  const tryRpc = await runLoggedQuery("whatsapp.credentials.rpc", {}, () =>
    client.rpc("get_whatsapp_credentials")
  );
  if (!tryRpc.error && Array.isArray(tryRpc.data) && tryRpc.data.length > 0) {
    return tryRpc.data[0];
  }

  const fallback = await runLoggedQuery("whatsapp.credentials.table", {}, () =>
    client
      .from("whatsapp_config")
      .select("phone_number_id, access_token, activo, alias, created_at")
      .eq("activo", true)
      .order("created_at", { ascending: false })
      .limit(1)
  );

  if (fallback.error) {
    throw new Error(fallback.error.message);
  }

  return fallback.data?.[0] || null;
}

async function sendWhatsAppMessage(messageData) {
  const credentials = await fetchWhatsAppCredentials();
  if (!credentials?.phone_number_id || !credentials?.access_token) {
    throw new Error("Credenciales de WhatsApp no configuradas");
  }

  const endpoint = `${process.env.WHATSAPP_GRAPH_BASE_URL || "https://graph.facebook.com/v24.0"}/${credentials.phone_number_id}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    ...messageData,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${credentials.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responseData = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `WhatsApp API Error ${response.status}: ${
        responseData.error?.message || response.statusText
      }`
    );
  }

  return responseData;
}

async function logWhatsAppMessage(client, row) {
  try {
    await runLoggedQuery("whatsapp.messages.log", row, () =>
      client.from("whatsapp_mensajes_log").insert(row)
    );
  } catch (error) {
    console.warn("No se pudo registrar el log de WhatsApp:", error.message);
  }
}

async function fetchDeposits({
  date,
  period,
  ids,
  limit = 500,
  regularized = false,
}) {
  const client = getSupabaseAdminClient();
  if (!client) {
    throw new Error("Supabase no estÃ¡ configurado en el backend");
  }

  let query = client.from("depositos").select(
    `id, numero_operacion, cliente, monto, fecha_registro, fecha_solo_date, imagen_voucher, anexo, numero_operacion_banco, fecha_deposito, estado, observaciones, motivo_rechazo, fecha_validacion, referencia_cliente, validado_por, moneda, ruc_cliente, telefono_origen, es_antiguo,
  empresa:empresa_id (id, nombre, estado, abreviatura),
  banco:banco_id (id, abreviatura, estado),
  sucursal:sucursal_id (id, nombre),
  trabajador:trabajador_sucursal_id (id, nombre, telefono_origen),
  validado_por_usuario:validado_por (id, nombre)`
  );

  if (regularized) {
    query = query
      .ilike("observaciones", "%**registros manual**%")
      .order("fecha_registro", { ascending: false })
      .limit(limit);
    const { data, error } = await runLoggedQuery(
      "depositos.regularized",
      { regularized: true, limit },
      () => query
    );
    if (error) throw new Error(error.message);
    return data || [];
  }

  if (Array.isArray(ids) && ids.length > 0) {
    const uniqueIds = [...new Set(ids.map((value) => String(value).trim()).filter(Boolean))];
    const chunks = chunkArray(uniqueIds, 100);
    const results = [];

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const chunkQuery = client
        .from("depositos")
        .select(
          `id, numero_operacion, cliente, monto, fecha_registro, fecha_solo_date, imagen_voucher, anexo, numero_operacion_banco, fecha_deposito, estado, observaciones, motivo_rechazo, fecha_validacion, referencia_cliente, validado_por, moneda, ruc_cliente, telefono_origen, es_antiguo,
  empresa:empresa_id (id, nombre, estado, abreviatura),
  banco:banco_id (id, abreviatura, estado),
  sucursal:sucursal_id (id, nombre),
  trabajador:trabajador_sucursal_id (id, nombre, telefono_origen),
  validado_por_usuario:validado_por (id, nombre)`
        )
        .in("id", chunk)
        .order("fecha_registro", { ascending: false });

      const { data, error } = await runLoggedQuery(
        "depositos.byIds.chunk",
        { chunkIndex: index, chunkSize: chunk.length, totalIds: uniqueIds.length },
        () => chunkQuery
      );

      if (error) throw new Error(error.message);
      if (Array.isArray(data) && data.length > 0) {
        results.push(...data);
      }
    }

    results.sort((a, b) => {
      const aTime = new Date(a.fecha_registro || a.fecha_solo_date || 0).getTime();
      const bTime = new Date(b.fecha_registro || b.fecha_solo_date || 0).getTime();
      return bTime - aTime;
    });

    return results.slice(0, limit);
  }

  if (date) {
    query = query.eq("fecha_solo_date", date).order("fecha_registro", { ascending: false });
    const { data, error } = await runLoggedQuery("depositos.byDate", { date }, () => query);
    if (error) throw new Error(error.message);
    return data || [];
  }

  if (period) {
    const now = new Date();
    if (period.startsWith("month:")) {
      const [year, month] = period.split(":")[1].split("-").map(Number);
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0);
      query = query
        .gte("fecha_solo_date", startOfMonth.toISOString().split("T")[0])
        .lte("fecha_solo_date", endOfMonth.toISOString().split("T")[0]);
    } else {
      switch (period) {
        case "today":
          query = query.eq("fecha_solo_date", now.toISOString().split("T")[0]);
          break;
        case "week": {
          const dayOfWeek = now.getDay();
          const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - daysFromMonday);
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          query = query
            .gte("fecha_solo_date", startOfWeek.toISOString().split("T")[0])
            .lte("fecha_solo_date", endOfWeek.toISOString().split("T")[0]);
          break;
        }
        case "month": {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          query = query
            .gte("fecha_solo_date", startOfMonth.toISOString().split("T")[0])
            .lte("fecha_solo_date", endOfMonth.toISOString().split("T")[0]);
          break;
        }
        default:
          break;
      }
    }

    let allData = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await runLoggedQuery(
        "depositos.byPeriod.page",
        { period, page, from, to },
        () =>
          query
            .order("fecha_registro", { ascending: false })
            .range(from, to)
      );

      if (error) throw new Error(error.message);

      allData = [...allData, ...(data || [])];
      hasMore = data && data.length === pageSize;
      page += 1;
      if (page >= 50) hasMore = false;
    }

    return allData;
  }

  const { data, error } = await runLoggedQuery(
    "depositos.all",
    { limit },
    () => query.order("fecha_registro", { ascending: false }).limit(limit)
  );
  if (error) throw new Error(error.message);
  return data || [];
}

function resolvePeriodDateRange(period) {
  if (!period) return null;

  const now = new Date();

  if (period.startsWith("month:")) {
    const [year, month] = period.split(":")[1].split("-").map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    return {
      startDate: startOfMonth.toISOString().split("T")[0],
      endDate: endOfMonth.toISOString().split("T")[0],
    };
  }

  switch (period) {
    case "today":
      return {
        startDate: now.toISOString().split("T")[0],
        endDate: now.toISOString().split("T")[0],
      };
    case "week": {
      const dayOfWeek = now.getDay();
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - daysFromMonday);
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);
      return {
        startDate: startOfWeek.toISOString().split("T")[0],
        endDate: endOfWeek.toISOString().split("T")[0],
      };
    }
    case "month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        startDate: startOfMonth.toISOString().split("T")[0],
        endDate: endOfMonth.toISOString().split("T")[0],
      };
    }
    default:
      return null;
  }
}

function registerJsonRoutes(app) {
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "email y password son requeridos" });
      }

      const authClient = getSupabaseAuthClient();
      if (!authClient) {
        return res.status(503).json({ error: "Supabase no estÃ¡ configurado en el backend" });
      }

      const { data, error } = await authClient.auth.signInWithPassword({ email, password });
      if (error) throw error;

      res.json({ data });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, fullName } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "email y password son requeridos" });
      }

      const authClient = getSupabaseAuthClient();
      if (!authClient) {
        return res.status(503).json({ error: "Supabase no estÃ¡ configurado en el backend" });
      }

      const { data, error } = await authClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName || email.split("@")[0],
          },
        },
      });

      if (error) throw error;
      res.status(201).json({ data });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/me", async (req, res) => {
    try {
      const token =
        req.body?.accessToken ||
        (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (!token) {
        return res.status(401).json({ error: "accessToken es requerido" });
      }

      const authClient = getSupabaseAuthClient();
      if (!authClient) {
        return res.status(503).json({ error: "Supabase no estÃ¡ configurado en el backend" });
      }

      const { data, error } = await authClient.auth.getUser(token);
      if (error) throw error;

      res.json({ data });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  });

  app.post("/api/auth/password", async (req, res) => {
    try {
      const { accessToken, refreshToken, password } = req.body || {};
      if (!accessToken || !refreshToken || !password) {
        return res.status(400).json({ error: "accessToken, refreshToken y password son requeridos" });
      }

      const authClient = getSupabaseAuthClient();
      if (!authClient) {
        return res.status(503).json({ error: "Supabase no estÃ¡ configurado en el backend" });
      }

      const { data: sessionData, error: sessionError } = await authClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;

      const { data, error } = await authClient.auth.updateUser({ password });
      if (error) throw error;

      res.json({ data: { session: sessionData.session, user: data.user } });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", async (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/ycloud/configs", async (_req, res) => {
    try {
      const data = await fetchActiveYCloudConfigs();
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/ycloud/configs/active", async (_req, res) => {
    try {
      const data = await fetchActiveYCloudConfigs();
      res.json({ data: data.filter((config) => config.activo) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ycloud/configs", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const configData = { ...(req.body || {}) };

      if (configData.activo) {
        await runLoggedQuery("ycloud.configs.deactivateOthers", {}, () =>
          client.from("ycloud_config").update({ activo: false }).eq("activo", true)
        );
      }

      const { data, error } = await runLoggedQuery(
        "ycloud.configs.create",
        { alias: configData.alias, activo: configData.activo },
        () => client.from("ycloud_config").insert(configData).select("*").single()
      );

      if (error) throw error;
      res.status(201).json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/ycloud/configs/:id", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const configData = { ...(req.body || {}) };

      if (configData.activo) {
        await runLoggedQuery("ycloud.configs.deactivateOthers", {}, () =>
          client
            .from("ycloud_config")
            .update({ activo: false })
            .eq("activo", true)
            .neq("id", req.params.id)
        );
      }

      const { data, error } = await runLoggedQuery(
        "ycloud.configs.update",
        { id: req.params.id, alias: configData.alias, activo: configData.activo },
        () =>
          client
            .from("ycloud_config")
            .update(configData)
            .eq("id", req.params.id)
            .select("*")
            .single()
      );

      if (error) throw error;
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/ycloud/configs/:id", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { error } = await runLoggedQuery(
        "ycloud.configs.delete",
        { id: req.params.id },
        () => client.from("ycloud_config").delete().eq("id", req.params.id)
      );
      if (error) throw error;
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ycloud/test-connection", async (req, res) => {
    try {
      const { configId } = req.body || {};
      if (!configId) {
        return res.status(400).json({ error: "configId es requerido" });
      }

      const config = await fetchYCloudConfigById(configId);
      const response = await fetch(YCLOUD_BALANCE_URL, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-API-Key": config.api_key,
        },
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: data.error?.message || response.statusText,
          details: data,
        });
      }

      res.json({
        success: true,
        data,
        message: `ConexiÃ³n exitosa con YCloud. Balance: ${data.amount ?? "N/A"} ${data.currency ?? ""}`.trim(),
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/ycloud/send", async (req, res) => {
    try {
      const data = await sendYCloudMessage(req.body || {});
      res.json({ success: true, data, message: "Mensaje enviado exitosamente via YCloud" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/ycloud/test", async (req, res) => {
    try {
      const { configId, to } = req.body || {};
      if (!configId || !to) {
        return res.status(400).json({ success: false, error: "configId y to son requeridos" });
      }

      const data = await sendYCloudMessage({
        configId,
        to,
        type: "text",
        text: {
          body: `Mensaje de prueba desde YCloud\n\nHora: ${new Date().toLocaleString()}\nSistema: Backend persistente\nEstado: Conectado correctamente`,
          previewUrl: false,
        },
      });

      res.json({ success: true, data, message: "Mensaje de prueba enviado exitosamente" });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/ycloud/conversation", async (req, res) => {
    try {
      const { configId, phoneNumber, startDate, endDate, limit = 50 } = req.body || {};
      if (!configId || !phoneNumber) {
        return res.status(400).json({ success: false, error: "configId y phoneNumber son requeridos" });
      }

      const config = await fetchYCloudConfigById(configId);
      const queryParams = new URLSearchParams();
      queryParams.append("page.size", String(limit));
      if (startDate) queryParams.append("filter.createTime.gte", startDate);
      if (endDate) queryParams.append("filter.createTime.lte", endDate);

      const apiUrl = `${YCLOUD_MESSAGES_URL}?${queryParams.toString()}`;
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-API-Key": config.api_key,
        },
      });

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        return res.status(response.status).json({
          success: false,
          error: responseData.error?.message || response.statusText,
          messages: [],
          details: responseData,
        });
      }

      const allMessages = responseData.items || responseData.data || [];
      const cleanPhone = String(phoneNumber).replace(/[\s\-\(\)\+]/g, "");
      const filteredMessages = allMessages.filter((msg) => {
        const msgTo = String(msg.to || "").replace(/[\s\-\(\)\+]/g, "");
        const msgFrom = String(msg.from || "").replace(/[\s\-\(\)\+]/g, "");
        return (
          msgTo.includes(cleanPhone) ||
          msgFrom.includes(cleanPhone) ||
          cleanPhone.includes(msgTo) ||
          cleanPhone.includes(msgFrom)
        );
      });

      const configFromNumber = String(config.default_from_number || "").replace(/[\s\-\(\)\+]/g, "");
      const formattedMessages = filteredMessages.map((msg) => {
        const msgFrom = String(msg.from || "").replace(/[\s\-\(\)\+]/g, "");
        const isOutbound =
          msgFrom === configFromNumber ||
          msgFrom.includes(configFromNumber) ||
          configFromNumber.includes(msgFrom);

        return {
          id: msg.id,
          direction: isOutbound ? "outbound" : "inbound",
          text: msg.text?.body || msg.template?.name || "",
          content: msg.text?.body || msg.template?.name || (msg.type !== "text" ? `[${msg.type}]` : ""),
          type: msg.type,
          status: msg.status,
          timestamp: msg.createTime || msg.sendTime,
          createdAt: msg.createTime,
          to: msg.to,
          from: msg.from,
          errorCode: msg.errorCode,
          errorMessage: msg.errorMessage,
          externalId: msg.externalId,
        };
      });

      formattedMessages.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.createdAt).getTime();
        const dateB = new Date(b.timestamp || b.createdAt).getTime();
        return dateA - dateB;
      });

      res.json({
        success: true,
        message: `Se encontraron ${formattedMessages.length} mensajes`,
        messages: formattedMessages,
        totalCount: allMessages.length,
        filteredCount: formattedMessages.length,
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message, messages: [] });
    }
  });

  app.get("/api/whatsapp/credentials", async (_req, res) => {
    try {
      const credentials = await fetchWhatsAppCredentials();
      res.json({ data: credentials || null });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/whatsapp/send", async (req, res) => {
    try {
      const responseData = await sendWhatsAppMessage(req.body || {});
      const client = getSupabaseAdminClient();
      if (client) {
        await logWhatsAppMessage(client, {
          telefono_destino: req.body?.to || null,
          tipo_mensaje: req.body?.type || "text",
          contenido: req.body || {},
          estado: "enviado",
          enviado_en: new Date().toISOString(),
          message_id: responseData.messages?.[0]?.id || responseData.id || null,
        });
      }

      res.json({ success: true, data: responseData });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/whatsapp/log", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      if (!client) {
        return res.status(503).json({ error: "Supabase no estÃ¡ configurado en el backend" });
      }

      const { data, error } = await client
        .from("whatsapp_mensajes_log")
        .insert(req.body || {})
        .select("*")
        .single();

      if (error) throw error;
      res.status(201).json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/personal/search", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const searchTerm = String(req.query.q || "").trim();
      const limit = Number(req.query.limit || 10);
      const includeInactive = req.query.includeInactive === "1" || req.query.includeInactive === "true";

      if (!searchTerm || searchTerm.length < 2) {
        return res.json({ data: [] });
      }

      const { data, error } = await runLoggedQuery(
        "personal.search",
        { searchTerm, limit },
        () => {
          let query = client
            .from("sucursal_personal")
            .select(
              `
              id,
              nombre,
              telefono_origen,
              empresa,
              es_responsable,
              estado,
              sucursal:sucursal_id (
                id,
                nombre,
                telefono
              )
            `
            )
            .or(`nombre.ilike.%${searchTerm}%,telefono_origen.ilike.%${searchTerm}%`)
            .order("nombre")
            .limit(limit);

          if (!includeInactive) {
            query = query.eq("estado", "activo");
          }

          return query;
        }
      );

      if (error) throw error;
      res.json({ data: data || [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/depositos/check-duplicate", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { monto, moneda, numero_operacion_banco, excludeId } = req.body || {};

      if (!monto || !moneda || !numero_operacion_banco) {
        return res.status(400).json({
          checked: true,
          isDuplicate: true,
          message: "El importe, moneda y número de operación bancaria son necesarios para la comprobación.",
        });
      }

      const { data, error } = await runLoggedQuery(
        "depositos.duplicateCheck",
        { monto, moneda, numero_operacion_banco, excludeId },
        () =>
          client
            .from("depositos")
            .select(
              `
              id,
              numero_operacion_banco,
              monto,
              moneda,
              fecha_deposito,
              fecha_registro,
              estado,
              sucursal:sucursal_id(nombre),
              trabajador:trabajador_sucursal_id(nombre),
              empresa:empresa_id(nombre),
              banco:banco_id(nombre, abreviatura)
            `
            )
            .eq("monto", monto)
            .eq("moneda", moneda)
            .neq("id", excludeId)
            .eq("estado", "validado")
      );

      if (error) throw error;

      const normalizedInputOp = String(numero_operacion_banco).replace(/^0+/, "");
      const duplicates =
        (data || []).filter((d) => {
          if (d.numero_operacion_banco) {
            const normalizedDbOpBanco = String(d.numero_operacion_banco).replace(/^0+/, "");
            if (normalizedDbOpBanco === normalizedInputOp) return true;
          }

          return false;
        }) || [];

      res.json({
        checked: true,
        isDuplicate: duplicates.length > 0,
        duplicates,
        message:
          duplicates.length > 0
            ? `Â¡Alerta de Duplicado! Se encontraron ${duplicates.length} depÃ³sito(s) con los mismos datos.`
            : "No se encontraron duplicados. Puede confirmar el depÃ³sito.",
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await runLoggedQuery(
        "users.profile.get",
        { userId: req.params.id },
        () => client.from("profiles").select("*").eq("id", req.params.id).single()
      );
      if (error) throw error;
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/users/details", async (req, res) => {
    try {
      const session = await getAuthenticatedUserFromRequest(req);
      if (!session.isAdmin) {
        return res.status(403).json({ error: "Acceso denegado: solo administradores pueden ver usuarios." });
      }

      const client = getSupabaseAdminClient();
      const [authUsersRes, profilesRes] = await Promise.all([
        runLoggedQuery("users.details.auth_users", {}, () =>
          client.auth.admin.listUsers({ page: 1, perPage: 1000 })
        ),
        runLoggedQuery("users.details.profiles", {}, () =>
          client
            .from("profiles")
            .select("id, nombre, usuario, email, rol, estado")
        ),
      ]);

      if (authUsersRes.error) throw authUsersRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const profilesById = new Map((profilesRes.data || []).map((profile) => [String(profile.id), profile]));
      const authUsers = authUsersRes.data?.users || [];

      const data = authUsers.map((authUser) => {
        const profile = profilesById.get(String(authUser.id)) || {};
        return {
          id: authUser.id,
          nombre:
            profile.nombre ||
            authUser.user_metadata?.nombre ||
            authUser.user_metadata?.full_name ||
            authUser.email?.split("@")[0] ||
            "Usuario",
          usuario: profile.usuario || authUser.email || "",
          email: profile.email || authUser.email || "",
          rol: profile.rol || "finanzas",
          user_rol: profile.rol || "finanzas",
          estado: profile.estado || "activo",
          last_sign_in_at: authUser.last_sign_in_at || null,
        };
      });

      res.json({ data });
    } catch (error) {
      res.status(error?.statusCode || 500).json({ error: error.message });
    }
  });

  app.put("/api/users/:id/profile", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await runLoggedQuery(
        "users.profile.update",
        { userId: req.params.id, updates: req.body },
        () =>
          client
            .from("profiles")
            .update(req.body)
            .eq("id", req.params.id)
            .select("*")
            .single()
      );
      if (error) throw error;
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/connection/status", async (_req, res) => {
    try {
      const client = getSupabaseAdminClient();
      if (!client) {
        return res.status(503).json({ ok: false, connected: false });
      }

      const { error } = await runLoggedQuery(
        "connection.status",
        {},
        () => client.from("depositos").select("id").limit(1)
      );
      if (error) throw error;

      res.json({ ok: true, connected: true });
    } catch (error) {
      res.status(500).json({ ok: false, connected: false, error: error.message });
    }
  });

  app.get("/api/dashboard/bootstrap", async (_req, res) => {
    try {
      const data = await fetchBootstrapData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/bancos", async (_req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await runLoggedQuery("bancos.list", { table: "bancos" }, () =>
        client.from("bancos").select("*").order("nombre", { ascending: true })
      );
      if (error) throw error;
      res.json({ data: data || [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/empresas", async (_req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await runLoggedQuery("empresas.list", { table: "empresas" }, () =>
        client.from("empresas").select("*").order("nombre", { ascending: true })
      );
      if (error) throw error;
      res.json({ data: data || [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/cuentas-bancarias", async (_req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await runLoggedQuery("cuentas.list", { table: "cuentas_bancarias" }, () =>
        client
          .from("cuentas_bancarias")
          .select("*, empresa:empresas(*), banco:bancos(*)")
          .order("created_at", { ascending: false })
      );
      if (error) throw error;
      res.json({ data: data || [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sucursales", async (_req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await runLoggedQuery("sucursales.list", { table: "sucursales" }, () =>
        client.from("sucursales").select("*").order("nombre", { ascending: true })
      );
      if (error) throw error;
      res.json({ data: data || [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sucursales/activity", async (req, res) => {
    try {
      await getAuthenticatedUserFromRequest(req);

      const client = getSupabaseAdminClient();
      const period = String(req.query.period || "month").trim();
      const range = resolvePeriodDateRange(period);

      const [sucursalesRes, depositsRes] = await Promise.all([
        runLoggedQuery("sucursales.activity.list", { period }, () =>
          client
            .from("sucursales")
            .select("id, nombre, estado, telefono")
            .eq("estado", "activa")
            .order("nombre", { ascending: true })
        ),
        runLoggedQuery("sucursales.activity.deposits", { period, range }, () => {
          let query = client
            .from("depositos")
            .select("id, sucursal_id, fecha_solo_date, fecha_registro, estado");

          if (range) {
            query = query
              .gte("fecha_solo_date", range.startDate)
              .lte("fecha_solo_date", range.endDate);
          }

          return query;
        }),
      ]);

      if (sucursalesRes.error) throw sucursalesRes.error;
      if (depositsRes.error) throw depositsRes.error;

      const statsBySucursal = new Map();
      (depositsRes.data || []).forEach((deposit) => {
        const sucursalId = deposit.sucursal_id;
        if (!sucursalId) return;

        const current = statsBySucursal.get(String(sucursalId)) || {
          total_depositos: 0,
          ultimo_deposito: null,
        };

        current.total_depositos += 1;
        const currentDate = deposit.fecha_solo_date || deposit.fecha_registro || null;
        if (
          currentDate &&
          (!current.ultimo_deposito || String(currentDate) > String(current.ultimo_deposito))
        ) {
          current.ultimo_deposito = currentDate;
        }

        statsBySucursal.set(String(sucursalId), current);
      });

      const data = (sucursalesRes.data || []).map((sucursal) => {
        const stats = statsBySucursal.get(String(sucursal.id)) || {
          total_depositos: 0,
          ultimo_deposito: null,
        };

        return {
          ...sucursal,
          total_depositos: stats.total_depositos,
          ultimo_deposito: stats.ultimo_deposito,
          sin_depositos: stats.total_depositos === 0,
        };
      });

      const sortedByLowActivity = [...data].sort((a, b) => {
        const totalDiff = Number(a.total_depositos || 0) - Number(b.total_depositos || 0);
        if (totalDiff !== 0) return totalDiff;

        const aDate = a.ultimo_deposito ? new Date(a.ultimo_deposito).getTime() : 0;
        const bDate = b.ultimo_deposito ? new Date(b.ultimo_deposito).getTime() : 0;
        return aDate - bDate;
      });

      const sinDepositos = sortedByLowActivity.filter((sucursal) => sucursal.total_depositos === 0);
      const menosDe10Depositos = sortedByLowActivity.filter((sucursal) => Number(sucursal.total_depositos || 0) < 10);

      res.json({
        period,
        total: data.length,
        sinDepositosCount: sinDepositos.length,
        menosDe10DepositosCount: menosDe10Depositos.length,
        data,
        sinDepositos,
        menosDe10Depositos,
      });
    } catch (error) {
      res.status(error.statusCode || 500).json({ error: error.message });
    }
  });

  app.get("/api/personal", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const limit = req.query.limit ? Number(req.query.limit) : 2000;
      const includeInactive = String(req.query.includeInactive || "").toLowerCase() === "1" ||
        String(req.query.includeInactive || "").toLowerCase() === "true";

      let query = client
        .from("sucursal_personal")
        .select("*, sucursales:sucursal_id(*)")
        .order("nombre", { ascending: true })
        .limit(limit);

      if (!includeInactive) {
        query = query.eq("estado", "activo");
      }

      const { data, error } = await runLoggedQuery(
        "personal.list",
        { table: "sucursal_personal", limit, includeInactive },
        () => query
      );

      if (error) throw error;
      res.json({ data: data || [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/depositos", async (req, res) => {
    try {
      const ids = String(req.query.ids || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      const data = await fetchDeposits({
        date: req.query.date || undefined,
        period: req.query.period || undefined,
        ids: ids.length > 0 ? ids : undefined,
        limit: req.query.limit ? Number(req.query.limit) : 500,
        regularized: req.query.regularized === "1" || req.query.regularized === "true",
      });
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/documents/vouchers", async (req, res) => {
    try {
      const period = req.query.period || undefined;
      const search = String(req.query.search || "").trim().toLowerCase();
      const page = req.query.page ? Number(req.query.page) : 1;
      const pageSize = req.query.pageSize ? Number(req.query.pageSize) : 12;

      const result = await fetchDocumentsVoucherPage({
        date: req.query.date || undefined,
        period,
        search,
        page,
        pageSize,
      });

      res.json(result);
    } catch (error) {
      console.error("[API] ERROR /api/documents/vouchers", {
        message: error.message,
        stack: error.stack,
        query: req.query,
      });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/documents/vouchers/download", async (req, res) => {
    try {
      const { url, filename } = req.body || {};
      if (!url) {
        return res.status(400).json({ error: "url es requerido" });
      }

      const { buffer, contentType, sourceUrl } = await fetchVoucherBinary(url);
      const resolvedFilename = sanitizeFilenamePart(
        filename || `voucher_${Date.now()}`,
        "voucher"
      );

      res.setHeader("Content-Type", contentType || "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${resolvedFilename}"`);
      res.setHeader("X-Voucher-Source-Url", sourceUrl);
      res.send(buffer);
    } catch (error) {
      console.error("[API] ERROR /api/documents/vouchers/download", {
        message: error.message,
        stack: error.stack,
        body: redactSensitiveBody(req.body),
      });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/documents/vouchers/export-job", async (req, res) => {
    try {
      const authContext = await getAuthenticatedUserFromRequest(req).catch(() => null);
      const ids = Array.isArray(req.body?.ids)
        ? req.body.ids
        : String(req.body?.ids || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);

      const filters = {
        ids,
        exportMode: req.body?.exportMode || null,
        specificDate: req.body?.specificDate || null,
        filterPeriod: req.body?.filterPeriod || req.body?.period || "all",
        selectedMonth: req.body?.selectedMonth || null,
        searchTerm: req.body?.searchTerm || "",
        filterStatus: req.body?.filterStatus || "all",
        zipSizeBytes: null,
        zipFilename: "vouchers_depositos.zip",
        createdBy: authContext?.authUser?.id || null,
      };

      const hasDirectIds = Array.isArray(ids) && ids.length > 0;
      const hasFilters =
        Boolean(filters.specificDate) ||
        Boolean(filters.filterPeriod && filters.filterPeriod !== "all") ||
        Boolean(filters.searchTerm?.trim()) ||
        Boolean(filters.filterStatus && filters.filterStatus !== "all");

      if (!hasDirectIds && !hasFilters) {
        return res.status(400).json({ error: "Debes enviar ids o filtros de exportaciÃ³n" });
      }

      const queuedJob = await queueVoucherExportJob(filters, authContext?.authUser?.id || null);

      res.json({
        data: {
          jobId: queuedJob.id,
          status: queuedJob.status,
          progress: queuedJob.progress,
          total: queuedJob.total,
        },
      });
    } catch (error) {
      console.error("[API] ERROR /api/documents/vouchers/export-job", {
        message: error.message,
        stack: error.stack,
        body: redactSensitiveBody(req.body),
      });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/documents/vouchers/export-filtered", async (req, res) => {
    try {
      const authContext = await getAuthenticatedUserFromRequest(req).catch(() => null);
      const filters = {
        ids: Array.isArray(req.body?.ids) ? req.body.ids : [],
        exportMode: req.body?.exportMode || null,
        specificDate: req.body?.specificDate || null,
        filterPeriod: req.body?.filterPeriod || req.body?.period || "all",
        selectedMonth: req.body?.selectedMonth || null,
        searchTerm: req.body?.searchTerm || "",
        filterStatus: req.body?.filterStatus || "all",
      };

      const hasDirectIds = Array.isArray(filters.ids) && filters.ids.length > 0;
      const hasFilters =
        Boolean(filters.specificDate) ||
        Boolean(filters.filterPeriod && filters.filterPeriod !== "all") ||
        Boolean(filters.searchTerm?.trim()) ||
        Boolean(filters.filterStatus && filters.filterStatus !== "all");

      if (!hasDirectIds && !hasFilters) {
        return res.status(400).json({ error: "Debes enviar ids o filtros de exportaciÃ³n" });
      }

      const queuedJob = await queueVoucherExportJob(filters, authContext?.authUser?.id || null);
      res.status(202).json({
        data: {
          jobId: queuedJob.id,
          status: queuedJob.status,
          progress: queuedJob.progress,
          total: queuedJob.total,
        },
      });
    } catch (error) {
      console.error("[API] ERROR /api/documents/vouchers/export-filtered", {
        message: error.message,
        stack: error.stack,
        body: redactSensitiveBody(req.body),
      });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/documents/vouchers/export-jobs", async (req, res) => {
    try {
      const limit = req.query.limit ? Math.max(1, Number(req.query.limit)) : 25;
      const jobs = await fetchVoucherExportJobRows(limit);

      res.json({ data: jobs });
    } catch (error) {
      console.error("[API] ERROR /api/documents/vouchers/export-jobs", {
        message: error.message,
        stack: error.stack,
      });
      res.json({ data: Array.from(voucherExportJobs.values()).map(createVoucherExportJobSnapshot) });
    }
  });

  app.get("/api/documents/vouchers/export-job/:jobId", async (req, res) => {
    try {
      const job = await fetchVoucherExportJobRow(req.params.jobId).catch(() => null);
      if (!job) {
        return res.status(404).json({ error: "Job no encontrado" });
      }

      res.json({ data: createVoucherExportJobSnapshot(job) });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/documents/vouchers/export-job/:jobId/download", async (req, res) => {
    try {
      const job = await fetchVoucherExportJobRow(req.params.jobId).catch(() => null);
      if (!job) {
        return res.status(404).json({ error: "Job no encontrado" });
      }

      if (job.status !== "completed" || !job.zipBuffer) {
        return res.status(409).json({
          error: "El ZIP todavÃ­a no estÃ¡ listo",
          status: job.status,
          progress: job.progress,
        });
      }

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="vouchers_depositos.zip"');
      const zipBuffer = job.zipBuffer || null;

      if (!zipBuffer || zipBuffer.length === 0) {
        return res.status(404).json({ error: "El ZIP no esta disponible" });
      }

      res.send(zipBuffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/documents/vouchers/export", async (req, res) => {
    try {
      const authContext = await getAuthenticatedUserFromRequest(req).catch(() => null);
      const ids = Array.isArray(req.body?.ids)
        ? req.body.ids
        : String(req.body?.ids || "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);

      if (ids.length === 0) {
        return res.status(400).json({ error: "ids es requerido" });
      }

      const queuedJob = await queueVoucherExportJob({ ids }, authContext?.authUser?.id || null);

      res.status(202).json({
        data: {
          jobId: queuedJob.id,
          status: queuedJob.status,
          progress: queuedJob.progress,
          total: queuedJob.total,
        },
      });
    } catch (error) {
      console.error("[API] ERROR /api/documents/vouchers/export", {
        message: error.message,
        stack: error.stack,
        body: redactSensitiveBody(req.body),
      });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/depositos", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await runLoggedQuery(
        "depositos.create",
        { keys: Object.keys(req.body || {}) },
        () =>
          client
            .from("depositos")
            .insert(req.body || {})
            .select(
              `id, numero_operacion, cliente, monto, fecha_registro, fecha_solo_date, imagen_voucher, anexo, numero_operacion_banco, fecha_deposito, estado, observaciones, motivo_rechazo, fecha_validacion, referencia_cliente, validado_por, moneda, ruc_cliente, telefono_origen, es_antiguo,
  empresa:empresa_id (id, nombre, estado, abreviatura),
  banco:banco_id (id, abreviatura, estado),
  sucursal:sucursal_id (id, nombre),
  trabajador:trabajador_sucursal_id (id, nombre, telefono_origen),
  validado_por_usuario:validado_por (id, nombre)`
            )
            .single()
      );
      if (error) throw error;
      broadcastDepositChange("INSERT", data, null, {
        source: "api/depositos",
      });
      res.status(201).json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/reportes/summary", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const selectedTrendPeriod = req.query.trendPeriod || "semana";
      const [summaryRes, sucursalRes, bancoRes, trendsRes, crUSDRes, crPENRes, topSucursalesRes, rejectedRes] =
        await Promise.all([
          client.rpc("get_deposits_summary_by_currency", { p_moneda: null }),
          client.rpc("get_confirmed_deposits_by_sucursal_currency", { p_moneda: null }),
          client.rpc("get_confirmed_deposits_by_banco_currency", { p_moneda: null }),
          client.rpc("get_daily_deposit_trends_currency", { p_moneda: null }),
          client.rpc("get_daily_confirmed_rejected_by_currency", {
            p_moneda: "USD",
            p_periodo: selectedTrendPeriod,
          }),
          client.rpc("get_daily_confirmed_rejected_by_currency", {
            p_moneda: "PEN",
            p_periodo: selectedTrendPeriod,
          }),
          client.rpc("get_top_sucursales_by_confirmations", { p_limit: 10 }),
          client.rpc("get_rejected_deposits_by_sucursal", { p_limit: 10 }),
        ]);

      const errors = [
        summaryRes.error,
        sucursalRes.error,
        bancoRes.error,
        trendsRes.error,
        crUSDRes.error,
        crPENRes.error,
        topSucursalesRes.error,
        rejectedRes.error,
      ].filter(Boolean);

      if (errors.length > 0) {
        throw errors[0];
      }

      const translateDayToSpanish = (dayText) => {
        const translations = {
          Mon: "Lun",
          Tue: "Mar",
          Wed: "MiÃ©",
          Thu: "Jue",
          Fri: "Vie",
          Sat: "SÃ¡b",
          Sun: "Dom",
          January: "Enero",
          February: "Febrero",
          March: "Marzo",
          April: "Abril",
          May: "Mayo",
          June: "Junio",
          July: "Julio",
          August: "Agosto",
          September: "Septiembre",
          October: "Octubre",
          November: "Noviembre",
          December: "Diciembre",
          Jan: "Ene",
          Feb: "Feb",
          Mar: "Mar",
          Apr: "Abr",
          Jun: "Jun",
          Jul: "Jul",
          Aug: "Ago",
          Sep: "Sep",
          Oct: "Oct",
          Nov: "Nov",
          Dec: "Dic",
        };

        let translated = dayText;
        Object.keys(translations).forEach((eng) => {
          translated = translated.replace(eng, translations[eng]);
        });
        return translated;
      };

      const groupByName = (data) => {
        const grouped = {};
        data.forEach((item) => {
          if (!grouped[item.nombre]) {
            grouped[item.nombre] = {
              nombre: item.nombre,
              usd: { monto: 0, cantidad: 0, porcentaje: 0 },
              pen: { monto: 0, cantidad: 0, porcentaje: 0 },
            };
          }
          if (item.moneda === "USD") grouped[item.nombre].usd = { monto: item.monto, cantidad: item.cantidad, porcentaje: item.porcentaje };
          if (item.moneda === "PEN") grouped[item.nombre].pen = { monto: item.monto, cantidad: item.cantidad, porcentaje: item.porcentaje };
        });
        return Object.values(grouped);
      };

      res.json({
        summary: summaryRes.data || [],
        bySucursal: groupByName(sucursalRes.data || []),
        byBanco: groupByName(bancoRes.data || []),
        trends: trendsRes.data || [],
        confirmedRejectedUSD: (crUSDRes.data || []).map((item) => ({ ...item, dia: translateDayToSpanish(item.dia) })),
        confirmedRejectedPEN: (crPENRes.data || []).map((item) => ({ ...item, dia: translateDayToSpanish(item.dia) })),
        topSucursales: topSucursalesRes.data || [],
        rejectedBySucursal: rejectedRes.data || [],
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/bancos", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await client
        .from("bancos")
        .insert([{ ...req.body, estado: "activo" }])
        .select()
        .single();
      if (error) throw error;
      res.status(201).json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/bancos/:id", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await client
        .from("bancos")
        .update(req.body)
        .eq("id", req.params.id)
        .select()
        .single();
      if (error) throw error;
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/bancos/:id", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { error } = await client.from("bancos").delete().eq("id", req.params.id);
      if (error) throw error;
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/empresas", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await client
        .from("empresas")
        .insert({ ...req.body, estado: "activo" })
        .select()
        .single();
      if (error) throw error;
      res.status(201).json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/empresas/:id", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await client
        .from("empresas")
        .update(req.body)
        .eq("id", req.params.id)
        .select()
        .single();
      if (error) throw error;
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cuentas-bancarias", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await client
        .from("cuentas_bancarias")
        .insert(req.body)
        .select("*, empresa:empresas(*), banco:bancos(*)")
        .single();
      if (error) throw error;
      res.status(201).json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/cuentas-bancarias/bulk", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
      const { data, error } = await client
        .from("cuentas_bancarias")
        .insert(rows)
        .select("*, empresa:empresas(*), banco:bancos(*)");
      if (error) throw error;
      res.status(201).json({ data: data || [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/cuentas-bancarias/:id", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await client
        .from("cuentas_bancarias")
        .update(req.body)
        .eq("id", req.params.id)
        .select("*, empresa:empresas(*), banco:bancos(*)")
        .single();
      if (error) throw error;
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/cuentas-bancarias/:id", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { error } = await client.from("cuentas_bancarias").delete().eq("id", req.params.id);
      if (error) throw error;
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sucursales", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await client.from("sucursales").insert(req.body).select().single();
      if (error) throw error;
      res.status(201).json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/sucursales/:id", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await client
        .from("sucursales")
        .update(req.body)
        .eq("id", req.params.id)
        .select()
        .single();
      if (error) throw error;
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/personal", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await client.from("sucursal_personal").insert(req.body).select().single();
      if (error) throw error;
      res.status(201).json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/personal/:id", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await client
        .from("sucursal_personal")
        .update(req.body)
        .eq("id", req.params.id)
        .select()
        .single();
      if (error) throw error;
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/personal/:id", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { error } = await client.from("sucursal_personal").delete().eq("id", req.params.id);
      if (error) throw error;
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sucursales/import-workers", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];

      if (rows.length === 0) {
        return res.status(400).json({ error: "rows es requerido" });
      }

      const sucursalesMap = new Map();
      for (const row of rows) {
        const key = String(row?.sucursal || "").trim();
        if (!key) continue;
        if (!sucursalesMap.has(key)) {
          sucursalesMap.set(key, []);
        }
        sucursalesMap.get(key).push(row);
      }

      let successCount = 0;
      let errorCount = 0;

      for (const [sucursalNombre, workers] of sucursalesMap.entries()) {
        const existingSucursalRes = await runLoggedQuery(
          "sucursales.import.searchSucursal",
          { sucursalNombre },
          () => client.from("sucursales").select("id").eq("nombre", sucursalNombre).maybeSingle()
        );

        if (existingSucursalRes.error) {
          errorCount += workers.length;
          continue;
        }

        let sucursalId = existingSucursalRes.data?.id || null;
        if (!sucursalId) {
          const createSucursalRes = await runLoggedQuery(
            "sucursales.import.createSucursal",
            { sucursalNombre },
            () =>
              client
                .from("sucursales")
                .insert({ nombre: sucursalNombre, estado: "activa" })
                .select("*")
                .single()
          );

          if (createSucursalRes.error) {
            errorCount += workers.length;
            continue;
          }

          sucursalId = createSucursalRes.data?.id || null;
        }

        for (const worker of workers) {
          try {
            const tipo = String(worker?.tipo || "").toUpperCase();
            const nombre = String(worker?.nombreTrabajador || "").trim();
            const telefono = String(worker?.telefono || "").trim();
            const empresa = String(worker?.empresa || "").trim() || null;

            if (!nombre || !telefono) {
              errorCount++;
              continue;
            }

            if (tipo === "ELIMINAR") {
              const existingWorkerRes = await runLoggedQuery(
                "sucursales.import.searchWorkerDelete",
                { nombre, telefono },
                () =>
                  client
                    .from("sucursal_personal")
                    .select("id")
                    .eq("nombre", nombre)
                    .eq("telefono_origen", telefono)
                    .maybeSingle()
              );

              if (existingWorkerRes.error || !existingWorkerRes.data) {
                errorCount++;
                continue;
              }

              const deactivateRes = await runLoggedQuery(
                "sucursales.import.deactivateWorker",
                { id: existingWorkerRes.data.id },
                () =>
                  client
                    .from("sucursal_personal")
                    .update({ estado: "inactivo" })
                    .eq("id", existingWorkerRes.data.id)
              );

              if (deactivateRes.error) {
                errorCount++;
              } else {
                successCount++;
              }
              continue;
            }

            const existingByPhoneRes = await runLoggedQuery(
              "sucursales.import.searchByPhone",
              { telefono },
              () =>
                client
                  .from("sucursal_personal")
                  .select("id, estado, sucursal_id, nombre")
                  .eq("telefono_origen", telefono)
                  .maybeSingle()
            );

            if (existingByPhoneRes.error) {
              errorCount++;
              continue;
            }

            if (
              existingByPhoneRes.data &&
              String(existingByPhoneRes.data.sucursal_id) !== String(sucursalId)
            ) {
              errorCount++;
              continue;
            }

            const existingWorkerRes = await runLoggedQuery(
              "sucursales.import.searchWorker",
              { nombre, telefono },
              () =>
                client
                  .from("sucursal_personal")
                  .select("id, estado")
                  .eq("nombre", nombre)
                  .eq("telefono_origen", telefono)
                  .maybeSingle()
            );

            if (existingWorkerRes.error) {
              errorCount++;
              continue;
            }

            if (existingWorkerRes.data) {
              if (existingWorkerRes.data.estado === "inactivo") {
                const reactivateRes = await runLoggedQuery(
                  "sucursales.import.reactivateWorker",
                  { id: existingWorkerRes.data.id },
                  () =>
                    client
                      .from("sucursal_personal")
                      .update({ estado: "activo" })
                      .eq("id", existingWorkerRes.data.id)
                );

                if (reactivateRes.error) {
                  errorCount++;
                } else {
                  successCount++;
                }
              } else {
                errorCount++;
              }
              continue;
            }

            const insertRes = await runLoggedQuery(
              "sucursales.import.insertWorker",
              { sucursalId, nombre, telefono },
              () =>
                client
                  .from("sucursal_personal")
                  .insert({
                    sucursal_id: sucursalId,
                    nombre,
                    telefono_origen: telefono,
                    empresa,
                    estado: "activo",
                    tipo_registro: "importado",
                  })
                  .select("*")
                  .single()
            );

            if (insertRes.error) {
              errorCount++;
            } else {
              successCount++;
            }
          } catch {
            errorCount++;
          }
        }
      }

      res.json({ ok: true, successCount, errorCount });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/depositos/:id", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { id, empresa, banco, sucursal, trabajador, validado_por_usuario, ...updateData } = req.body || {};
      const targetId = req.params.id || id;
      const { data, error } = await runLoggedQuery(
        "depositos.update",
        { id: targetId, updateKeys: Object.keys(updateData) },
        () =>
          client
            .from("depositos")
            .update(updateData)
            .eq("id", targetId)
            .select(
              `id, numero_operacion, cliente, monto, fecha_registro, fecha_solo_date, imagen_voucher, anexo, numero_operacion_banco, fecha_deposito, estado, observaciones, motivo_rechazo, fecha_validacion, referencia_cliente, validado_por, moneda, ruc_cliente, telefono_origen, es_antiguo,
  empresa:empresa_id (id, nombre, estado, abreviatura),
  banco:banco_id (id, abreviatura, estado),
  sucursal:sucursal_id (id, nombre),
  trabajador:trabajador_sucursal_id (id, nombre, telefono_origen),
  validado_por_usuario:validado_por (id, nombre)`
            )
            .single()
      );
      if (error) throw error;
      broadcastDepositChange("UPDATE", data, null, {
        source: "api/depositos/:id",
        id: targetId,
      });
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/depositos/:id", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const existing = await runLoggedQuery(
        "depositos.delete.fetchBeforeDelete",
        { id: req.params.id },
        () => client.from("depositos").select("*").eq("id", req.params.id).maybeSingle()
      );
      if (existing.error) throw existing.error;
      const { error } = await runLoggedQuery(
        "depositos.delete",
        { id: req.params.id },
        () => client.from("depositos").delete().eq("id", req.params.id)
      );
      if (error) throw error;
      broadcastDepositChange("DELETE", null, existing.data || null, {
        source: "api/depositos/:id",
        id: req.params.id,
      });
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/drive-files/unlinked", async (_req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await runLoggedQuery(
        "driveFiles.unlinked",
        {},
        () =>
          client
            .from("drive_files")
            .select("*")
            .is("deposito_id", null)
            .order("id", { ascending: false })
      );
      if (error) throw error;
      res.json({ data: data || [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/drive-files/deposit/:depositoId", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await runLoggedQuery(
        "driveFiles.byDeposit",
        { depositoId: req.params.depositoId },
        () =>
          client
            .from("drive_files")
            .select("*")
            .eq("deposito_id", req.params.depositoId)
            .order("id", { ascending: false })
      );
      if (error) throw error;
      res.json({ data: data || [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/drive-files/search", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const term = String(req.query.term || "").trim();
      if (!term) {
        return res.json({ data: [] });
      }

      const { data, error } = await runLoggedQuery(
        "driveFiles.search",
        { term },
        () =>
          client
            .from("drive_files")
            .select("*")
            .or(`file_url.ilike.%${term}%,deposito_id.eq.${term}`)
            .order("id", { ascending: false })
      );
      if (error) throw error;
      res.json({ data: data || [] });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/drive-files", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const payload = {
        file_url: req.body?.file_url,
        deposito_id: req.body?.deposito_id || null,
      };
      if (!payload.file_url) {
        return res.status(400).json({ error: "file_url es requerido" });
      }

      const { data, error } = await runLoggedQuery(
        "driveFiles.insert",
        payload,
        () => client.from("drive_files").insert([payload]).select().single()
      );
      if (error) throw error;
      res.status(201).json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/drive-files/:id/link", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const fileId = req.params.id;
      const depositoId = req.body?.deposito_id;
      if (!depositoId) {
        return res.status(400).json({ error: "deposito_id es requerido" });
      }

      const fileQuery = await runLoggedQuery(
        "driveFiles.link.fetch",
        { fileId, depositoId },
        () => client.from("drive_files").select("file_url").eq("id", fileId).single()
      );
      if (fileQuery.error) throw fileQuery.error;

      const { data: updatedFile, error: linkError } = await runLoggedQuery(
        "driveFiles.link.updateFile",
        { fileId, depositoId },
        () =>
          client
            .from("drive_files")
            .update({ deposito_id: depositoId })
            .eq("id", fileId)
            .select()
            .single()
      );
      if (linkError) throw linkError;

      const { data: updatedDeposit, error: depositError } = await runLoggedQuery(
        "driveFiles.link.updateDeposit",
        { fileId, depositoId },
        () =>
          client
            .from("depositos")
            .update({ imagen_voucher: fileQuery.data.file_url })
            .eq("id", depositoId)
            .select("id, imagen_voucher")
            .single()
      );
      if (depositError) {
        await client
          .from("drive_files")
          .update({ deposito_id: null })
          .eq("id", fileId);
        throw depositError;
      }

      broadcastDepositChange("UPDATE", updatedDeposit, null, {
        source: "api/drive-files/:id/link",
        fileId,
        depositoId,
      });

      res.json({ data: { file: updatedFile, deposito: updatedDeposit } });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/drive-files/:id/unlink", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { data, error } = await runLoggedQuery(
        "driveFiles.unlink",
        { id: req.params.id },
        () =>
          client
            .from("drive_files")
            .update({ deposito_id: null })
            .eq("id", req.params.id)
            .select()
            .single()
      );
      if (error) throw error;
      if (data?.deposito_id) {
        const refreshedDeposit = await runLoggedQuery(
          "driveFiles.unlink.refreshDeposit",
          { fileId: req.params.id, depositoId: data.deposito_id },
          () =>
            client
              .from("depositos")
              .select(
                `id, numero_operacion, cliente, monto, fecha_registro, fecha_solo_date, imagen_voucher, anexo, numero_operacion_banco, fecha_deposito, estado, observaciones, motivo_rechazo, fecha_validacion, referencia_cliente, validado_por, moneda, ruc_cliente, telefono_origen, es_antiguo,
  empresa:empresa_id (id, nombre, estado, abreviatura),
  banco:banco_id (id, abreviatura, estado),
  sucursal:sucursal_id (id, nombre),
  trabajador:trabajador_sucursal_id (id, nombre, telefono_origen),
  validado_por_usuario:validado_por (id, nombre)`
              )
              .eq("id", data.deposito_id)
              .single()
        );

        if (!refreshedDeposit.error) {
          broadcastDepositChange("UPDATE", refreshedDeposit.data || null, null, {
            source: "api/drive-files/:id/unlink",
            fileId: req.params.id,
            depositoId: data.deposito_id,
          });
        }
      }
      res.json({ data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/drive-files/:id", async (req, res) => {
    try {
      const client = getSupabaseAdminClient();
      const { error } = await runLoggedQuery(
        "driveFiles.delete",
        { id: req.params.id },
        () => client.from("drive_files").delete().eq("id", req.params.id)
      );
      if (error) throw error;
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

function broadcast(event) {
  const payload = `event: deposit-change\ndata: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

function broadcastDepositChange(eventType, row, oldRow = null, meta = {}) {
  const event = {
    type: "deposit-change",
    eventType,
    new: row || null,
    old: oldRow || null,
    meta,
    timestamp: new Date().toISOString(),
  };

  console.log("[SSE] deposit-change", {
    eventType,
    id: row?.id || oldRow?.id || null,
    clients: clients.size,
  });

  broadcast(event);
}

function setRealtimeStatus(status, error = null) {
  realtimeStatus = status;
  if (status === "SUBSCRIBED") {
    console.log("Backend realtime conectado a depositos");
  } else if (status === "CHANNEL_ERROR") {
    console.error("Backend realtime error:", error);
  } else if (status === "TIMED_OUT") {
    console.warn("Backend realtime timeout:", error || "");
  } else if (status === "CLOSED") {
    console.warn("Backend realtime canal cerrado");
  }
}

function scheduleRealtimeReconnect() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
  }

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    channel = null;
    startDepositRealtimeHub();
  }, 5000);
}

export function startDepositRealtimeHub() {
  const client = getSupabaseClient();
  if (!client) {
    console.warn(
      "Backend realtime desactivado: faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY"
    );
    realtimeStatus = "DISABLED";
    return false;
  }

  if (channel) return true;

  channel = client
    .channel("backend-depositos-realtime")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "depositos" },
      (payload) => {
        broadcast({
          type: "deposit-change",
          eventType: payload.eventType,
          new: payload.new,
          old: payload.old,
          timestamp: new Date().toISOString(),
        });
      }
    )
    .subscribe((status, error) => {
      setRealtimeStatus(status, error);

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        try {
          channel?.unsubscribe?.();
        } catch (unsubscribeError) {
          console.warn("Backend realtime: error al desuscribir canal:", unsubscribeError);
        } finally {
          channel = null;
          scheduleRealtimeReconnect();
        }
      }
    });

  return true;
}

export function registerDepositSseRoute(app) {
  app.get("/api/events/depositos", (req, res) => {
    const allowedOrigin = getAllowedOrigin(req);

    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Cache-Control");
    res.setHeader("Vary", "Origin");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    console.log("[SSE] cliente conectado", {
      clients: clients.size + 1,
      realtimeStatus,
    });

    res.write(
      `event: connected\ndata: ${JSON.stringify({
        ok: true,
        timestamp: new Date().toISOString(),
      })}\n\n`
    );

    clients.add(res);

    const keepAlive = setInterval(() => {
      res.write(`event: ping\ndata: ${JSON.stringify({ ok: true })}\n\n`);
    }, 25000);

    req.on("close", () => {
      clearInterval(keepAlive);
      clients.delete(res);
      console.log("[SSE] cliente desconectado", {
        clients: clients.size,
        realtimeStatus,
      });
    });
  });

  app.options("/api/events/depositos", (req, res) => {
    const allowedOrigin = getAllowedOrigin(req);

    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Cache-Control");
    res.setHeader("Vary", "Origin");
    res.sendStatus(204);
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      clients: clients.size,
      realtime: !!channel,
      realtimeStatus,
    });
  });
}

export function registerDashboardApiRoutes(app) {
  registerNoCacheHeaders(app);
  registerJsonRoutes(app);
}

export { registerRequestLogger, runVoucherExportJob };
