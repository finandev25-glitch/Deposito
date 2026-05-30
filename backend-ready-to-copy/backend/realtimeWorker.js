import { createClient } from "@supabase/supabase-js";

function summarizeRealtimeError(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message || error.name || "Error";
  if (typeof error === "object") {
    return error.message || error.reason || error.code || error.status || "realtime error";
  }
  return String(error);
}

function sendMessage(message) {
  if (typeof process.send === "function") {
    process.send(message);
  }
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  sendMessage({
    type: "status",
    status: "DISABLED",
    error: "faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY",
  });
  process.exit(0);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

console.log("[realtime-worker] boot", {
  pid: process.pid,
  supabaseUrl: !!supabaseUrl,
  serviceRoleKey: !!serviceRoleKey,
});

const channel = client
  .channel("backend-depositos-realtime")
  .on(
    "postgres_changes",
    { event: "*", schema: "public", table: "depositos" },
    (payload) => {
      sendMessage({
        type: "deposit-change",
        eventType: payload.eventType,
        new: payload.new,
        old: payload.old,
        timestamp: new Date().toISOString(),
      });
    }
  );

let restartTimer = null;

function requestRestart(status, error) {
  sendMessage({
    type: "status",
    status,
    error: summarizeRealtimeError(error),
  });

  if (restartTimer) {
    return;
  }

  restartTimer = setTimeout(() => {
    process.exit(1);
  }, 1000);
}

try {
  channel.subscribe((status, error) => {
    if (status === "SUBSCRIBED") {
      sendMessage({ type: "status", status: "READY" });
      return;
    }

    if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
      requestRestart(status, error);
      return;
    }

    sendMessage({
      type: "status",
      status,
      error: summarizeRealtimeError(error),
    });
  });
} catch (error) {
  sendMessage({
    type: "status",
    status: "ERROR",
    error: summarizeRealtimeError(error),
  });
  throw error;
}

process.on("uncaughtException", (error) => {
  sendMessage({
    type: "status",
    status: "ERROR",
    error: summarizeRealtimeError(error),
  });
  process.exit(1);
});

process.on("unhandledRejection", (error) => {
  sendMessage({
    type: "status",
    status: "ERROR",
    error: summarizeRealtimeError(error),
  });
  process.exit(1);
});

const shutdown = () => {
  if (restartTimer) {
    clearTimeout(restartTimer);
  }
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("disconnect", shutdown);
