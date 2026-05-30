import fs from "fs";
import path from "path";

const QUEUE_FILE_PATH = path.resolve(process.cwd(), "data", "voucher-export-queue.json");

function ensureQueueDir() {
  fs.mkdirSync(path.dirname(QUEUE_FILE_PATH), { recursive: true });
}

function createEmptyState() {
  return { jobs: [] };
}

function readStateSync() {
  try {
    if (!fs.existsSync(QUEUE_FILE_PATH)) {
      return createEmptyState();
    }

    const raw = fs.readFileSync(QUEUE_FILE_PATH, "utf8");
    if (!raw.trim()) return createEmptyState();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return createEmptyState();
    if (!Array.isArray(parsed.jobs)) parsed.jobs = [];
    return parsed;
  } catch {
    return createEmptyState();
  }
}

function writeStateSync(state) {
  ensureQueueDir();
  const nextState = {
    jobs: Array.isArray(state?.jobs) ? state.jobs : [],
  };
  const tempPath = `${QUEUE_FILE_PATH}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(nextState, null, 2), "utf8");
  fs.renameSync(tempPath, QUEUE_FILE_PATH);
}

function normalizeJob(job) {
  if (!job || typeof job !== "object") return null;
  if (!job.id) return null;

  return {
    id: String(job.id),
    status: String(job.status || "queued"),
    progress: Number(job.progress || 0),
    total: Number(job.total || 0),
    processed: Number(job.processed || 0),
    filesAdded: Number(job.filesAdded || 0),
    failures: Array.isArray(job.failures) ? job.failures : [],
    error: job.error || null,
    filters: job.filters || {},
    createdAt: job.createdAt || new Date().toISOString(),
    updatedAt: job.updatedAt || new Date().toISOString(),
    completedAt: job.completedAt || null,
    zipBucket: job.zipBucket || null,
    zipPath: job.zipPath || null,
    zipSizeBytes: job.zipSizeBytes ?? null,
    zipFilename: job.zipFilename || "vouchers_depositos.zip",
    createdBy: job.createdBy || null,
  };
}

export function readVoucherExportJobs() {
  const state = readStateSync();
  return state.jobs.map(normalizeJob).filter(Boolean);
}

export function getVoucherExportJobFromQueue(jobId) {
  if (!jobId) return null;
  return readVoucherExportJobs().find((job) => String(job.id) === String(jobId)) || null;
}

export function listVoucherExportJobsFromQueue(limit = 25) {
  return readVoucherExportJobs()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, Math.max(1, Number(limit) || 25));
}

export function upsertVoucherExportJobInQueue(job) {
  const nextJob = normalizeJob(job);
  if (!nextJob) return null;

  const state = readStateSync();
  const jobs = state.jobs.filter((item) => String(item.id) !== String(nextJob.id));
  jobs.push(nextJob);
  writeStateSync({ jobs });
  return nextJob;
}

export function patchVoucherExportJobInQueue(jobId, patch) {
  if (!jobId || !patch || typeof patch !== "object") return null;

  const state = readStateSync();
  let updated = null;
  const jobs = state.jobs.map((item) => {
    if (String(item.id) !== String(jobId)) return item;
    updated = normalizeJob({
      ...item,
      ...patch,
      id: item.id,
      updatedAt: new Date().toISOString(),
    });
    return updated;
  });

  if (!updated) return null;
  writeStateSync({ jobs });
  return updated;
}

export function claimNextQueuedVoucherExportJob() {
  const state = readStateSync();
  const jobs = [...state.jobs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const nextJob = jobs.find((job) => String(job.status) === "queued");
  if (!nextJob) return null;

  const claimed = normalizeJob({
    ...nextJob,
    status: "processing",
    progress: Math.max(Number(nextJob.progress || 0), 1),
    updatedAt: new Date().toISOString(),
  });

  const updatedJobs = state.jobs.map((job) => (String(job.id) === String(nextJob.id) ? claimed : job));
  writeStateSync({ jobs: updatedJobs });
  return claimed;
}
