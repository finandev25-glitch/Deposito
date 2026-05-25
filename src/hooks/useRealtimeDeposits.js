import { useEffect, useRef } from 'react';
import { apiGet } from '../services/backendApi.js';
import { logger } from '../utils/logger';

/**
 * Hook para suscripción al canal SSE del backend de depósitos.
 * Mantiene batching y debounce, pero ya no depende de Supabase directo.
 */
export const useRealtimeDeposits = (isBackendConnected, currentUser, onUpdate, queryString) => {
  const updateQueueRef = useRef([]);
  const processingTimeoutRef = useRef(null);
  const isProcessingRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  const eventSourceRef = useRef(null);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!isBackendConnected || !currentUser) {
      return;
    }

    const executeBatchQuery = async () => {
      if (isProcessingRef.current || updateQueueRef.current.length === 0) return;

      isProcessingRef.current = true;
      const recordIds = [...new Set(updateQueueRef.current.map((item) => item.id))];
      updateQueueRef.current = [];

      logger.log('🔴 REALTIME procesando batch:', recordIds.length, 'depósitos');

      let attempts = 0;
      const maxAttempts = 3;
      let success = false;

      while (attempts < maxAttempts && !success) {
        attempts++;
        try {
          logger.log(`🔍 REALTIME query intento ${attempts}/${maxAttempts} para IDs:`, recordIds);

          const response = await apiGet(`/depositos?ids=${encodeURIComponent(recordIds.join(','))}`);
          const updatedDeposits = response?.data || [];

          logger.log('📊 REALTIME resultado query:', {
            data: updatedDeposits?.length
          });

          if (updatedDeposits && updatedDeposits.length > 0) {
            logger.log('📤 REALTIME llamando onUpdate con', updatedDeposits.length, 'depósitos');
            onUpdateRef.current(updatedDeposits);
            logger.log('✅ REALTIME actualizó', updatedDeposits.length, 'depósitos');
          } else {
            logger.warn('⚠️ REALTIME query retornó vacío para IDs:', recordIds);
          }

          success = true;
        } catch (error) {
          logger.error(`💥 Error en intento ${attempts}:`, error.message);

          if (attempts < maxAttempts) {
            const delay = 1000 * attempts;
            logger.log(`⏳ Esperando ${delay}ms antes de reintentar...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            logger.error('❌ Se agotaron los intentos para el batch:', recordIds);
          }
        }
      }

      isProcessingRef.current = false;

      if (updateQueueRef.current.length > 0) {
        processingTimeoutRef.current = setTimeout(() => {
          executeBatchQuery();
        }, 100);
      }
    };

    const handleRealtimeChange = (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      logger.log('🔴 REALTIME evento:', eventType, 'ID:', newRecord?.id || oldRecord?.id);

      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        updateQueueRef.current.push({ id: newRecord.id, event: eventType });

        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
        }

        processingTimeoutRef.current = setTimeout(() => {
          executeBatchQuery();
        }, 100);
      } else if (eventType === 'DELETE') {
        onUpdateRef.current(null, oldRecord.id);
      }
    };

    const eventSource = new EventSource('/api/events/depositos');
    eventSourceRef.current = eventSource;

    const handleConnected = () => {
      logger.log('✅ REALTIME backend conectado para depósitos');
    };

    const handleChange = (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleRealtimeChange(payload);
      } catch (error) {
        logger.error('Error procesando evento SSE de depósitos:', error.message);
      }
    };

    const handleError = (event) => {
      logger.error('Error en el canal backend realtime:', event);
    };

    eventSource.addEventListener('connected', handleConnected);
    eventSource.addEventListener('deposit-change', handleChange);
    eventSource.onerror = handleError;

    return () => {
      logger.log('🔴 REALTIME limpiando suscripción');
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      eventSourceRef.current = null;
    };
  }, [isBackendConnected, currentUser, queryString]);
};

export default useRealtimeDeposits;
