import { supabase } from '../supabaseClient';

/**
 * Servicio de Realtime para Supabase
 *
 * ESTADO ACTUAL: WebSocket retorna 503 en servidor Easypanel
 *
 * Este servicio intentará conectar a Realtime, pero manejará
 * graciosamente el error 503 sin romper la aplicación.
 *
 * Cuando el servidor Realtime esté habilitado, funcionará automáticamente.
 */

let canalActivo = null;
let estadoConexion = 'DISCONNECTED';
let callbacks = {
  onInsert: null,
  onUpdate: null,
  onDelete: null,
  onStatusChange: null,
};

/**
 * Función para conectar a Realtime de la tabla depositos
 */
export function conectarRealtime(options = {}) {
  if (!supabase) {
    console.error('❌ REALTIME SERVICE: Supabase no está inicializado');
    return null;
  }

  // Si ya hay un canal activo, desconectarlo primero
  if (canalActivo) {
    console.log('🔄 REALTIME SERVICE: Desconectando canal anterior...');
    desconectarRealtime();
  }

  console.log('🔄 REALTIME SERVICE: Intentando conectar a Realtime...');

  // Guardar callbacks
  callbacks = {
    onInsert: options.onInsert || null,
    onUpdate: options.onUpdate || null,
    onDelete: options.onDelete || null,
    onStatusChange: options.onStatusChange || null,
  };

  // Crear canal único con timestamp para evitar conflictos
  const nombreCanal = `depositos-realtime-${Date.now()}`;

  const canal = supabase
    .channel(nombreCanal, {
      config: {
        broadcast: { self: false },
        presence: { key: 'realtime-service' }
      }
    })
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'depositos'
      },
      (payload) => {
        console.log('📨 REALTIME SERVICE: Evento recibido:', payload.eventType);

        switch (payload.eventType) {
          case 'INSERT':
            console.log('➕ REALTIME SERVICE: Nuevo depósito:', payload.new);
            if (callbacks.onInsert) {
              callbacks.onInsert(payload.new);
            }
            break;

          case 'UPDATE':
            console.log('🔄 REALTIME SERVICE: Depósito actualizado:', payload.new);
            if (callbacks.onUpdate) {
              callbacks.onUpdate(payload.new, payload.old);
            }
            break;

          case 'DELETE':
            console.log('🗑️ REALTIME SERVICE: Depósito eliminado:', payload.old);
            if (callbacks.onDelete) {
              callbacks.onDelete(payload.old);
            }
            break;

          default:
            console.log('❓ REALTIME SERVICE: Evento desconocido:', payload.eventType);
        }
      }
    )
    .subscribe((status, error) => {
      estadoConexion = status;
      console.log('🔔 REALTIME SERVICE: Estado de conexión:', status);

      // Notificar cambio de estado
      if (callbacks.onStatusChange) {
        callbacks.onStatusChange(status, error);
      }

      if (status === 'SUBSCRIBED') {
        console.log('✅ REALTIME SERVICE: Conectado exitosamente a Realtime');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ REALTIME SERVICE: Error de canal:', error);
        console.warn('💡 SUGERENCIA: Verifica que el servidor Realtime esté habilitado');
        console.warn('💡 SERVIDOR: https://evolutionapi-supabase.gnfcio.easypanel.host/realtime/v1/websocket');
      } else if (status === 'TIMED_OUT') {
        console.error('⏱️ REALTIME SERVICE: Timeout de conexión');
        console.warn('💡 SUGERENCIA: El servidor WebSocket no responde (probablemente error 503)');
      } else if (status === 'CLOSED') {
        console.log('🔴 REALTIME SERVICE: Canal cerrado');
      }
    });

  canalActivo = canal;
  return canal;
}

/**
 * Función para desconectar de Realtime
 */
export function desconectarRealtime() {
  if (!canalActivo) {
    console.log('⚠️ REALTIME SERVICE: No hay canal activo para desconectar');
    return;
  }

  console.log('🧹 REALTIME SERVICE: Desconectando de Realtime...');

  try {
    if (estadoConexion === 'SUBSCRIBED') {
      canalActivo.unsubscribe();
    }

    // Usar removeChannel en lugar de solo unsubscribe para limpieza completa
    supabase.removeChannel(canalActivo);

    console.log('✅ REALTIME SERVICE: Desconexión exitosa');
  } catch (error) {
    console.error('❌ REALTIME SERVICE: Error al desconectar:', error);
  } finally {
    canalActivo = null;
    estadoConexion = 'DISCONNECTED';
    callbacks = {
      onInsert: null,
      onUpdate: null,
      onDelete: null,
      onStatusChange: null,
    };
  }
}

/**
 * Función para obtener el estado actual de la conexión
 */
export function getEstadoRealtime() {
  return {
    estadoConexion,
    estaConectado: estadoConexion === 'SUBSCRIBED',
    canal: canalActivo,
  };
}

/**
 * Función para reconectar cuando la pestaña vuelve a estar activa
 */
export async function reconectarSiNecesario() {
  if (!document.hidden && supabase) {
    console.log('👁️ REALTIME SERVICE: Usuario regresó - verificando sesión...');

    // 1. Verificar sesión
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.log('⚠️ REALTIME SERVICE: No hay sesión, intentando refrescar...');
      const { data: refreshData, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('❌ REALTIME SERVICE: Error al refrescar sesión:', error);
        return;
      }

      if (refreshData?.session) {
        console.log('✅ REALTIME SERVICE: Sesión refrescada exitosamente');
      }
    } else {
      console.log('✅ REALTIME SERVICE: Sesión activa confirmada');
    }

    // 2. Reconectar Realtime si estaba conectado antes
    if (canalActivo && estadoConexion !== 'SUBSCRIBED') {
      console.log('🔄 REALTIME SERVICE: Intentando reconectar canal...');

      // Guardar callbacks actuales
      const callbacksActuales = { ...callbacks };

      // Desconectar y reconectar
      desconectarRealtime();

      // Esperar un momento antes de reconectar
      await new Promise(resolve => setTimeout(resolve, 500));

      // Reconectar con los mismos callbacks
      conectarRealtime(callbacksActuales);
    }
  }
}

// DESHABILITADO: Este listener global causa conflictos con el auto-reload en App.jsx
// Si necesitas reconexión automática de Realtime, llama manualmente a reconectarSiNecesario()
/*
// Configurar listener de visibilitychange automáticamente
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', reconectarSiNecesario);

  // Cleanup al cerrar la página
  window.addEventListener('beforeunload', () => {
    console.log('🚪 REALTIME SERVICE: Limpiando antes de cerrar...');
    desconectarRealtime();
  });
}
*/


/**
 * Ejemplo de uso:
 *
 * import { conectarRealtime, desconectarRealtime, getEstadoRealtime } from './services/realtimeService';
 *
 * // Conectar con callbacks
 * conectarRealtime({
 *   onInsert: (newDeposit) => {
 *     console.log('Nuevo depósito:', newDeposit);
 *   },
 *   onUpdate: (newDeposit, oldDeposit) => {
 *     console.log('Depósito actualizado:', newDeposit);
 *   },
 *   onDelete: (oldDeposit) => {
 *     console.log('Depósito eliminado:', oldDeposit);
 *   },
 *   onStatusChange: (status, error) => {
 *     console.log('Estado:', status);
 *   }
 * });
 *
 * // Verificar estado
 * const { estaConectado, estadoConexion } = getEstadoRealtime();
 *
 * // Desconectar
 * desconectarRealtime();
 */
