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

  const eventSource = new EventSource('/api/events/depositos');
  canalActivo = eventSource;
  emitStatus('CONNECTING');

  const handleConnected = () => {
    emitStatus('SUBSCRIBED');
  };

  const handleChange = (event) => {
    try {
      const payload = JSON.parse(event.data);
      const eventType = payload.eventType || payload.type;

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
    } catch (error) {
      console.error('REALTIME SERVICE: error procesando evento', error);
    }
  };

  const handleError = (error) => {
    emitStatus('CHANNEL_ERROR', error);
  };

  eventSource.addEventListener('connected', handleConnected);
  eventSource.addEventListener('deposit-change', handleChange);
  eventSource.onerror = handleError;

  return eventSource;
}

export function desconectarRealtime() {
  if (!canalActivo) {
    return;
  }

  try {
    canalActivo.close();
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
