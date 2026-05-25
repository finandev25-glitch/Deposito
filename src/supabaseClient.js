import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseUrl.startsWith("http")) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: "public",
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        flowType: "pkce",
      },
      global: {
        headers: {
          "X-Client-Info": "supabase-js-web",
        },
      },
      realtime: {
        timeout: 60000,
        params: {
          eventsPerSecond: 10,
        },
        heartbeatIntervalMs: 30000,
        reconnectAfterMs: (tries) => Math.min(1000 * Math.pow(2, tries), 10000),
      },
    });
  } catch (error) {
    console.error("Error al inicializar el cliente de Supabase:", error.message);
    supabase = null;
  }
}

export { supabase };
