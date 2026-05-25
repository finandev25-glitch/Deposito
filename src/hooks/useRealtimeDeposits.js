import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { apiGet } from "../services/backendApi.js";
import { logger } from "../utils/logger";

const BATCH_DELAY_MS = 80;
const RECONNECT_DELAY_MS = 3000;

/**
 * Frontend realtime hook for deposits.
 * Listens directly to Supabase postgres_changes and hydrates affected rows via API.
 */
export const useRealtimeDeposits = (isSupabaseConnected, currentUser, onUpdate) => {
  const [realtimeStatus, setRealtimeStatus] = useState("DISCONNECTED");
  const [realtimeErrors, setRealtimeErrors] = useState(0);

  const updateQueueRef = useRef([]);
  const processingTimeoutRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const channelRef = useRef(null);
  const isProcessingRef = useRef(false);
  const reconnectingRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  const statusRef = useRef("DISCONNECTED");

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

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

    if (channelRef.current && supabase) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        logger.error("Error closing realtime channel:", error.message);
      }
      channelRef.current = null;
    }
  }, []);

  const flushQueuedChanges = useCallback(async () => {
    if (isProcessingRef.current || updateQueueRef.current.length === 0) return;

    isProcessingRef.current = true;
    const queued = [...updateQueueRef.current];
    updateQueueRef.current = [];

    const deleteIds = [...new Set(queued.filter((item) => item.eventType === "DELETE" && item.id).map((item) => item.id))];
    const updateIds = [
      ...new Set(
        queued
          .filter((item) => item.eventType !== "DELETE" && item.id)
          .map((item) => item.id)
      ),
    ];

    if (deleteIds.length > 0) {
      deleteIds.forEach((id) => {
        onUpdateRef.current?.(null, id);
      });
    }

    if (updateIds.length > 0) {
      try {
        const response = await apiGet(`/depositos?ids=${encodeURIComponent(updateIds.join(","))}`);
        const updatedDeposits = response?.data || [];

        if (updatedDeposits.length > 0) {
          onUpdateRef.current?.(updatedDeposits);
        }
      } catch (error) {
        logger.error("Realtime batch hydration failed:", error.message);

        const fallbackUpdates = queued
          .filter((item) => item.eventType !== "DELETE" && item.payload)
          .map((item) => item.payload);

        if (fallbackUpdates.length > 0) {
          onUpdateRef.current?.(fallbackUpdates);
        }
      }
    }

    isProcessingRef.current = false;

    if (updateQueueRef.current.length > 0) {
      processingTimeoutRef.current = setTimeout(() => {
        flushQueuedChanges();
      }, BATCH_DELAY_MS);
    }
  }, []);

  const connectRealtime = useCallback(() => {
    cleanupConnection();

    if (!supabase || !isSupabaseConnected || !currentUser) {
      statusRef.current = "DISCONNECTED";
      setRealtimeStatus("DISCONNECTED");
      return;
    }

    statusRef.current = "CONNECTING";
    setRealtimeStatus("CONNECTING");

    const channelName = `frontend-depositos-${currentUser.id || "anon"}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "depositos" },
        (payload) => {
          const eventType = payload?.eventType;
          const recordId = payload?.new?.id || payload?.old?.id;

          if (!recordId) return;

          updateQueueRef.current.push({
            id: recordId,
            eventType,
            payload: payload?.new || payload?.old || null,
          });

          if (processingTimeoutRef.current) {
            clearTimeout(processingTimeoutRef.current);
          }

          processingTimeoutRef.current = setTimeout(() => {
            processingTimeoutRef.current = null;
            flushQueuedChanges();
          }, BATCH_DELAY_MS);
        }
      )
      .subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          statusRef.current = "SUBSCRIBED";
          setRealtimeStatus("SUBSCRIBED");
          setRealtimeErrors(0);
          reconnectingRef.current = false;
          return;
        }

        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          logger.error("Realtime channel error:", error);
          statusRef.current = "CHANNEL_ERROR";
          setRealtimeStatus("CHANNEL_ERROR");
          setRealtimeErrors((prev) => prev + 1);

          if (reconnectingRef.current) {
            return;
          }

          reconnectingRef.current = true;
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectTimeoutRef.current = null;
            reconnectingRef.current = false;
            connectRealtime();
          }, RECONNECT_DELAY_MS);
        }
      });

    channelRef.current = channel;
  }, [cleanupConnection, currentUser, flushQueuedChanges, isSupabaseConnected]);

  useEffect(() => {
    if (!supabase || !isSupabaseConnected || !currentUser) {
      cleanupConnection();
      statusRef.current = "DISCONNECTED";
      setRealtimeStatus("DISCONNECTED");
      return undefined;
    }

    connectRealtime();

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;

      if (statusRef.current !== "SUBSCRIBED") {
        connectRealtime();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      cleanupConnection();
    };
  }, [cleanupConnection, connectRealtime, currentUser, isSupabaseConnected]);

  return {
    realtimeStatus,
    realtimeErrors,
  };
};

export default useRealtimeDeposits;
