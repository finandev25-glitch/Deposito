import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet } from '../services/backendApi.js';
import { logger } from '../utils/logger';

/**
 * Realtime hook for the deposit backend SSE stream.
 * Handles batching, debounce, status tracking and recovery.
 */
export const useRealtimeDeposits = (isBackendConnected, currentUser, onUpdate, queryString) => {
  const [realtimeStatus, setRealtimeStatus] = useState(null);
  const [realtimeErrors, setRealtimeErrors] = useState(0);

  const updateQueueRef = useRef([]);
  const processingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const keepAliveIntervalRef = useRef(null);
  const eventSourceRef = useRef(null);
  const isProcessingRef = useRef(false);
  const reconnectingRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  const queryStringRef = useRef(queryString);
  const statusRef = useRef(null);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    queryStringRef.current = queryString;
  }, [onUpdate, queryString]);

  const cleanupConnection = useCallback(() => {
    reconnectingRef.current = false;

    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }

    if (eventSourceRef.current) {
      try {
        eventSourceRef.current.close();
      } catch (error) {
        logger.error('Error closing realtime EventSource:', error.message);
      }
      eventSourceRef.current = null;
    }
  }, []);

  const executeBatchQuery = useCallback(async () => {
    if (isProcessingRef.current || updateQueueRef.current.length === 0) return;

    isProcessingRef.current = true;
    const recordIds = [...new Set(updateQueueRef.current.map((item) => item.id))];
    updateQueueRef.current = [];

    logger.log('REALTIME batch size:', recordIds.length);

    let attempts = 0;
    const maxAttempts = 3;
    let success = false;

    while (attempts < maxAttempts && !success) {
      attempts++;
      try {
        const response = await apiGet(`/depositos?ids=${encodeURIComponent(recordIds.join(','))}`);
        const updatedDeposits = response?.data || [];

        if (updatedDeposits.length > 0) {
          onUpdateRef.current(updatedDeposits);
        }

        success = true;
      } catch (error) {
        logger.error(`Realtime batch attempt ${attempts} failed:`, error.message);

        if (attempts < maxAttempts) {
          const delay = 1000 * attempts;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    isProcessingRef.current = false;

    if (updateQueueRef.current.length > 0) {
      processingTimeoutRef.current = setTimeout(() => {
        executeBatchQuery();
      }, 100);
    }
  }, []);

  const connectRealtime = useCallback(() => {
    cleanupConnection();

    if (!isBackendConnected || !currentUser) {
      return;
    }

    statusRef.current = 'CONNECTING';
    setRealtimeStatus('CONNECTING');

    const eventSource = new EventSource('/api/events/depositos');
    eventSourceRef.current = eventSource;

    const handleConnected = () => {
      statusRef.current = 'SUBSCRIBED';
      setRealtimeStatus('SUBSCRIBED');
      setRealtimeErrors(0);
      reconnectingRef.current = false;
    };

    const handleChange = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { eventType, new: newRecord, old: oldRecord } = payload;

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
      } catch (error) {
        logger.error('Error processing deposit SSE event:', error.message);
      }
    };

    const handleError = (error) => {
      logger.error('Realtime channel error:', error);
      statusRef.current = 'CHANNEL_ERROR';
      setRealtimeStatus('CHANNEL_ERROR');
      setRealtimeErrors((prev) => prev + 1);

      if (reconnectingRef.current) {
        return;
      }

      reconnectingRef.current = true;
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        reconnectingRef.current = false;
        connectRealtime();
      }, 3000);
    };

    eventSource.addEventListener('connected', handleConnected);
    eventSource.addEventListener('deposit-change', handleChange);
    eventSource.onerror = handleError;

    keepAliveIntervalRef.current = setInterval(async () => {
      try {
        await apiGet('/health');
      } catch (error) {
        logger.error('Realtime keep alive failed:', error.message);
        if (document.visibilityState === 'visible') {
          connectRealtime();
        }
      }
    }, 2 * 60 * 1000);
  }, [cleanupConnection, currentUser, executeBatchQuery, isBackendConnected]);

  useEffect(() => {
    if (!isBackendConnected || !currentUser) {
      cleanupConnection();
      statusRef.current = 'DISCONNECTED';
      setRealtimeStatus('DISCONNECTED');
      return undefined;
    }

    connectRealtime();

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;

      if (statusRef.current !== 'SUBSCRIBED') {
        connectRealtime();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanupConnection();
    };
  }, [cleanupConnection, connectRealtime, currentUser, isBackendConnected]);

  return {
    realtimeStatus,
    realtimeErrors,
  };
};

export default useRealtimeDeposits;
