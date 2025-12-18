import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook OPCIONAL para Realtime de Supabase
 *
 * ESTADO ACTUAL: WebSocket retorna 503 en servidor Easypanel
 *
 * Este hook intentará conectar, pero si falla (503), solo mostrará
 * error en consola sin romper la aplicación.
 *
 * Cuando el servidor Realtime esté habilitado, este hook funcionará
 * automáticamente sin cambios de código.
 */
export function useRealtimeOptional(tableName, onUpdate, isEnabled = true) {
  const channelRef = useRef(null);
  const subscriptionStatusRef = useRef('UNSUBSCRIBED');

  useEffect(() => {
    // No intentar conectar si está deshabilitado o no hay Supabase
    if (!isEnabled || !supabase) {
      console.log('⚠️ REALTIME: Deshabilitado o Supabase no disponible');
      return;
    }

    console.log(`🔄 REALTIME: Intentando conectar a tabla "${tableName}"...`);

    // Crear canal y escuchar cambios
    const canal = supabase
      .channel(`${tableName}-channel-${Date.now()}`) // Nombre único con timestamp
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName
        },
        (payload) => {
          console.log(`📨 REALTIME: Cambio detectado en "${tableName}":`, payload);

          // Llamar callback si está definido
          if (onUpdate) {
            onUpdate(payload);
          }
        }
      )
      .subscribe((status, error) => {
        subscriptionStatusRef.current = status;

        console.log(`🔔 REALTIME: Estado del canal "${tableName}":`, status);

        if (status === 'SUBSCRIBED') {
          console.log(`✅ REALTIME: Conectado exitosamente a tabla "${tableName}"`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ REALTIME: Error de canal en "${tableName}":`, error);
          console.warn('💡 SUGERENCIA: Verifica que el servidor Realtime esté habilitado');
        } else if (status === 'TIMED_OUT') {
          console.error(`⏱️ REALTIME: Timeout de conexión en "${tableName}"`);
          console.warn('💡 SUGERENCIA: El servidor WebSocket no responde (probablemente error 503)');
        } else if (status === 'CLOSED') {
          console.log(`🔴 REALTIME: Canal cerrado en "${tableName}"`);
        }
      });

    // Guardar referencia del canal
    channelRef.current = canal;

    // Cleanup: desuscribir cuando el componente se desmonte
    return () => {
      if (channelRef.current) {
        console.log(`🧹 REALTIME: Limpiando suscripción de "${tableName}"`);

        // Solo desuscribir si estaba suscrito
        if (subscriptionStatusRef.current === 'SUBSCRIBED') {
          channelRef.current.unsubscribe();
        }

        channelRef.current = null;
        subscriptionStatusRef.current = 'UNSUBSCRIBED';
      }
    };
  }, [tableName, onUpdate, isEnabled]);

  // Retornar estado de la suscripción
  return {
    isSubscribed: subscriptionStatusRef.current === 'SUBSCRIBED',
    status: subscriptionStatusRef.current,
    channel: channelRef.current,
  };
}

/**
 * Ejemplo de uso:
 *
 * import { useRealtimeOptional } from './hooks/useRealtimeOptional';
 *
 * function MyComponent() {
 *   const handleRealtimeUpdate = (payload) => {
 *     console.log('Cambio:', payload.eventType, payload.new);
 *   };
 *
 *   // Intentará conectar, pero si falla (503), solo mostrará error en consola
 *   const { isSubscribed, status } = useRealtimeOptional(
 *     'depositos',           // Nombre de la tabla
 *     handleRealtimeUpdate,  // Callback cuando hay cambios
 *     true                   // Habilitado (cambiar a false para deshabilitar)
 *   );
 *
 *   return (
 *     <div>
 *       <p>Realtime status: {status}</p>
 *       <p>{isSubscribed ? '✅ Conectado' : '❌ Desconectado'}</p>
 *     </div>
 *   );
 * }
 */
