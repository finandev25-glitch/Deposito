import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

// Verifica si la URL de Supabase es válida antes de intentar crear el cliente.
// Esto previene el error si las credenciales no están configuradas.
if (supabaseUrl && supabaseUrl.startsWith('http')) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: 'public',
      },
      auth: {
        persistSession: true,              // ✅ Guardar sesión en localStorage
        autoRefreshToken: true,            // ✅ Refrescar token automáticamente
        detectSessionInUrl: true,          // ✅ Detectar sesión en URL (magic links)
        storage: window.localStorage,      // ✅ Usar localStorage para persistencia
        flowType: 'pkce',                  // ✅ Flujo PKCE más seguro
      },
      global: {
        headers: {
          'X-Client-Info': 'supabase-js-web'
        }
      },
      // ✅ Realtime optimizado para funcionar en segundo plano
      realtime: {
        timeout: 60000,                    // 60 segundos timeout
        params: {
          eventsPerSecond: 10,             // Límite de eventos por segundo
        },
        heartbeatIntervalMs: 30000,        // Heartbeat cada 30 segundos para mantener conexión
        reconnectAfterMs: (tries) => {
          // Reconexión rápida: 1s, 2s, 4s, 8s, max 10s
          return Math.min(1000 * Math.pow(2, tries), 10000);
        },
      }
    });

    console.log("✅ Cliente Supabase inicializado:");
    console.log("   - Auth con localStorage y auto-refresh");
    console.log("   - Realtime configurado con reconexión automática");
  } catch (error) {
    console.error("Error al inicializar el cliente de Supabase:", error.message);
    supabase = null;
  }
}

if (!supabase) {
  console.warn(
    "Credenciales de Supabase no válidas o no proporcionadas. La aplicación utilizará datos y autenticación simulados. Conecta tu proyecto de Supabase para habilitar las funciones en tiempo real."
  );
}

export { supabase };
