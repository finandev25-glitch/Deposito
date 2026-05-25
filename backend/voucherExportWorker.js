import { runVoucherExportJob } from "./realtimeHub.js";

function decodePayload(rawValue) {
  if (!rawValue) return null;

  try {
    const json = Buffer.from(String(rawValue), "base64url").toString("utf8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function main() {
  const payload = decodePayload(process.argv[2] || process.env.VOUCHER_EXPORT_WORKER_PAYLOAD);
  const jobId = payload?.jobId || process.env.VOUCHER_EXPORT_JOB_ID || null;
  const filters = payload?.filters || null;

  if (!jobId) {
    throw new Error("jobId es requerido para el worker de exportacion");
  }

  console.info("[WORKER] voucher export worker started", {
    jobId,
    hasFilters: !!filters,
  });

  await runVoucherExportJob(jobId, filters || {});

  console.info("[WORKER] voucher export worker finished", { jobId });
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[WORKER] voucher export worker error", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });
