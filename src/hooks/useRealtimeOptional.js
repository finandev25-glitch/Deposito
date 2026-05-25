import { useEffect, useRef, useState } from 'react';

/**
 * Hook opcional para escuchar el SSE del backend.
 * Hoy solo soporta la tabla de depósitos, que es el canal que el backend emite.
 */
export function useRealtimeOptional(tableName, onUpdate, isEnabled = true) {
  const eventSourceRef = useRef(null);
  const [status, setStatus] = useState('UNSUBSCRIBED');

  useEffect(() => {
    if (!isEnabled || tableName !== 'depositos') {
      setStatus('DISABLED');
      return;
    }

    const eventSource = new EventSource('/api/events/depositos');
    eventSourceRef.current = eventSource;
    setStatus('CONNECTING');

    const handleConnected = () => {
      setStatus('SUBSCRIBED');
    };

    const handleChange = (event) => {
      try {
        const payload = JSON.parse(event.data);
        onUpdate?.(payload);
      } catch (error) {
        console.error('Error procesando evento realtime del backend:', error);
      }
    };

    const handleError = (event) => {
      console.error('Error en el canal backend realtime:', event);
      setStatus('CHANNEL_ERROR');
    };

    eventSource.addEventListener('connected', handleConnected);
    eventSource.addEventListener('deposit-change', handleChange);
    eventSource.onerror = handleError;

    return () => {
      eventSource.removeEventListener('connected', handleConnected);
      eventSource.removeEventListener('deposit-change', handleChange);
      eventSource.close();
      eventSourceRef.current = null;
      setStatus('UNSUBSCRIBED');
    };
  }, [tableName, onUpdate, isEnabled]);

  return {
    isSubscribed: status === 'SUBSCRIBED',
    status,
    channel: eventSourceRef.current,
  };
}

export default useRealtimeOptional;
