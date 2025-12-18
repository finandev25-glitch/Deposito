import { useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { logger } from '../utils/logger';

/**
 * Hook optimizado para suscripción en tiempo real de depósitos
 * Implementa batching y debouncing para mejorar el rendimiento
 */
export const useRealtimeDeposits = (isSupabaseConnected, currentUser, onUpdate, queryString) => {
  const updateQueueRef = useRef([]);
  const processingTimeoutRef = useRef(null);
  const isProcessingRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  const queryStringRef = useRef(queryString);

  // Mantener referencias actualizadas sin causar re-suscripciones
  useEffect(() => {
    onUpdateRef.current = onUpdate;
    queryStringRef.current = queryString;
  }, [onUpdate, queryString]);

  useEffect(() => {
    if (!isSupabaseConnected || !currentUser) {
      return;
    }

    // Nueva implementación con bucle interno
    const executeBatchQuery = async () => {
      if (isProcessingRef.current || updateQueueRef.current.length === 0) return;

      isProcessingRef.current = true;
      const recordIds = [...new Set(updateQueueRef.current.map(item => item.id))];
      updateQueueRef.current = []; // Vaciar cola

      logger.log("🔴 REALTIME procesando batch:", recordIds.length, "depósitos");

      let attempts = 0;
      const maxAttempts = 3;
      let success = false;

      while (attempts < maxAttempts && !success) {
        attempts++;
        try {
          logger.log(`🔍 REALTIME query intento ${attempts}/${maxAttempts} para IDs:`, recordIds);

          const queryPromise = supabase
            .from("depositos")
            .select(queryStringRef.current)
            .in("id", recordIds);

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout en query realtime")), 10000)
          );

          const { data: updatedDeposits, error } = await Promise.race([
            queryPromise,
            timeoutPromise
          ]);

          if (error) throw error;

          logger.log("📊 REALTIME resultado query:", {
            data: updatedDeposits?.length
          });

          if (updatedDeposits && updatedDeposits.length > 0) {
            logger.log("📤 REALTIME llamando onUpdate con", updatedDeposits.length, "depósitos");
            onUpdateRef.current(updatedDeposits);
            logger.log("✅ REALTIME actualizó", updatedDeposits.length, "depósitos");
          } else {
            logger.warn("⚠️ REALTIME query retornó vacío para IDs:", recordIds);
          }

          success = true;

        } catch (error) {
          logger.error(`💥 Error en intento ${attempts}:`, error.message);

          if (attempts < maxAttempts) {
            const delay = 1000 * attempts; // 1s, 2s...
            logger.log(`⏳ Esperando ${delay}ms antes de reintentar...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            logger.error("❌ Se agotaron los intentos para el batch:", recordIds);
            // Opcional: Podríamos devolver los IDs a la cola, pero podría causar bucle infinito de errores
          }
        }
      }

      isProcessingRef.current = false;

      // Si llegaron más items mientras procesábamos, seguir
      if (updateQueueRef.current.length > 0) {
        processingTimeoutRef.current = setTimeout(() => {
          executeBatchQuery();
        }, 100);
      }
    };

    const handleRealtimeChange = (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      logger.log("🔴 REALTIME evento:", eventType, "ID:", newRecord?.id || oldRecord?.id);

      if (eventType === "INSERT" || eventType === "UPDATE") {
        // Agregar a la cola
        updateQueueRef.current.push({ id: newRecord.id, event: eventType });

        // Cancelar el timeout anterior
        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
        }

        // Procesar después de 100ms (debouncing)
        processingTimeoutRef.current = setTimeout(() => {
          executeBatchQuery();
        }, 100);

      } else if (eventType === "DELETE") {
        onUpdateRef.current(null, oldRecord.id); // null indica delete
      }
    };

    logger.log("🔴 REALTIME iniciando suscripción para usuario:", currentUser.nombre);

    // Nombre único del canal basado en el usuario para evitar conflictos
    const channelName = `realtime-depositos-${currentUser.id}`;

    // Track channel status
    let currentStatus = 'CLOSED';

    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: currentUser.id }
        }
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "depositos" },
        handleRealtimeChange
      )
      .subscribe((status, err) => {
        currentStatus = status;
        logger.log("🔴 REALTIME canal status:", status);
        if (status === 'SUBSCRIBED') {
          logger.log("✅ REALTIME suscripción exitosa");
        } else if (status === 'CHANNEL_ERROR') {
          logger.error("🔴 REALTIME error de canal:", err);
        } else if (status === 'TIMED_OUT') {
          logger.error("🔴 REALTIME timeout de conexión");
        } else if (status === 'CLOSED') {
          logger.log("🔴 REALTIME canal cerrado");
        }
      });

    // Re-check connection when tab becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        logger.log("👁️ REALTIME: Tab visible, verificando estado:", currentStatus);
        if (currentStatus !== 'SUBSCRIBED') {
          logger.log("⚠️ REALTIME: No conectado, intentando reconectar...");
          channel.subscribe();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      logger.log("🔴 REALTIME limpiando suscripción");
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      // Usar unsubscribe() en lugar de removeChannel() para evitar conflictos
      channel.unsubscribe();
    };
  }, [isSupabaseConnected, currentUser]); // Solo depende de conexión y usuario
};

export default useRealtimeDeposits;
