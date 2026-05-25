import { supabase } from '../supabaseClient';

let canalActivo = null;
let estadoConexion = 'DISCONNECTED';
let callbacks = {
  onInsert: null,
  onUpdate: null,
  onDelete: null,
  onStatusChange: null,
};

function emitStatus(status, error = null) {
  estadoConexion = status;
  if (callbacks.onStatusChange) {
    callbacks.onStatusChange(status, error);
  }
}

export function conectarRealtime(options = {}) {
  if (canalActivo) {
    desconectarRealtime();
  }

  callbacks = {
    onInsert: options.onInsert || null,
    onUpdate: options.onUpdate || null,
    onDelete: options.onDelete || null,
    onStatusChange: options.onStatusChange || null,
  };

  if (!supabase) {
    emitStatus('DISCONNECTED');
    return null;
  }

  const canal = supabase
    .channel(`realtime-service-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'depositos' },
      (payload) => {
        const eventType = payload.eventType;

        switch (eventType) {
          case 'INSERT':
            callbacks.onInsert?.(payload.new || payload.record || payload);
            break;
          case 'UPDATE':
            callbacks.onUpdate?.(payload.new || payload.record || payload, payload.old || null);
            break;
          case 'DELETE':
            callbacks.onDelete?.(payload.old || payload.record || payload);
            break;
          default:
            callbacks.onUpdate?.(payload);
        }
      }
    )
    .subscribe((status, error) => {
      if (status === 'SUBSCRIBED') {
        emitStatus('SUBSCRIBED');
        return;
      }

      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        emitStatus('CHANNEL_ERROR', error);
      } else {
        emitStatus(status, error);
      }
    });

  canalActivo = canal;
  emitStatus('CONNECTING');
  return canal;
}

export function desconectarRealtime() {
  if (!canalActivo) {
    return;
  }

  try {
    canalActivo.unsubscribe();
  } catch (error) {
    console.error('REALTIME SERVICE: error al cerrar canal', error);
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

export function getEstadoRealtime() {
  return {
    estadoConexion,
    estaConectado: estadoConexion === 'SUBSCRIBED',
    canal: canalActivo,
  };
}

export async function reconectarSiNecesario() {
  if (!document.hidden && canalActivo && estadoConexion !== 'SUBSCRIBED') {
    const callbacksActuales = { ...callbacks };
    desconectarRealtime();
    await new Promise((resolve) => setTimeout(resolve, 500));
    conectarRealtime(callbacksActuales);
  }
}
