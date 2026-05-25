import { runVoucherExportJob } from "./realtimeHub.js";
import { claimNextQueuedVoucherExportJob } from "./voucherExportQueueStore.js";

const POLL_INTERVAL_MS = Number(process.env.VOUCHER_EXPORT_QUEUE_POLL_MS || 3000);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.info("[QUEUE] voucher export queue worker started", {
    pollIntervalMs: POLL_INTERVAL_MS,
  });

  while (true) {
    try {
      const job = claimNextQueuedVoucherExportJob();
      if (!job) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }

      const filters = job.filters || {};
      console.info("[QUEUE] voucher export job claimed", {
        jobId: job.id,
        filters: {
          exportMode: filters.exportMode || null,
          filterPeriod: filters.filterPeriod || null,
          selectedMonth: filters.selectedMonth || null,
          specificDate: filters.specificDate || null,
          filterStatus: filters.filterStatus || null,
        },
      });

      await runVoucherExportJob(job.id, filters);
    } catch (error) {
      console.error("[QUEUE] voucher export queue worker error", {
        message: error.message,
        stack: error.stack,
      });
      await sleep(Math.max(5000, POLL_INTERVAL_MS));
    }
  }
}

main().catch((error) => {
  console.error("[QUEUE] fatal worker error", {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
