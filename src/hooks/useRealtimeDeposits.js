import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { logger } from "../utils/logger";

const BATCH_DELAY_MS = 100;
const RETRY_DELAY_MS = 3000;

export const useRealtimeDeposits = (isSupabaseConnected, currentUser, onUpdate, queryString) => {
  const [realtimeStatus, setRealtimeStatus] = useState(null);
  const [realtimeErrors, setRealtimeErrors] = useState(0);

  const updateQueueRef = useRef([]);
  const processingTimeoutRef = useRef(null);
  const isProcessingRef = useRef(false);
  const onUpdateRef = useRef(onUpdate);
  const queryStringRef = useRef(queryString);
  const statusRef = useRef("CLOSED");
  const channelRef = useRef(null);
  const reconnectingRef = useRef(false);
  const retryTimeoutRef = useRef(null);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    queryStringRef.current = queryString;
  }, [onUpdate, queryString]);

  useEffect(() => {
    if (!isSupabaseConnected || !currentUser || !supabase) {
      return;
    }

    const cleanupChannel = () => {
      if (channelRef.current) {
        try {
          supabase.removeChannel(channelRef.current);
        } catch (error) {
          logger.error("Error closing realtime channel:", error.message);
        }
        channelRef.current = null;
      }
    };

    const executeBatchQuery = async () => {
      if (isProcessingRef.current || updateQueueRef.current.length === 0) return;

      isProcessingRef.current = true;
      const recordIds = [...new Set(updateQueueRef.current.map((item) => item.id))];
      updateQueueRef.current = [];

      let attempts = 0;
      const maxAttempts = 3;
      let success = false;

      while (attempts < maxAttempts && !success) {
        attempts++;
        try {
          const queryPromise = supabase
            .from("depositos")
            .select(queryStringRef.current)
            .in("id", recordIds);

          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout en query realtime")), 10000)
          );

          const { data: updatedDeposits, error } = await Promise.race([queryPromise, timeoutPromise]);

          if (error) throw error;

          if (updatedDeposits && updatedDeposits.length > 0) {
            onUpdateRef.current(updatedDeposits);
          }

          success = true;
        } catch (error) {
          logger.error(`Error en intento ${attempts}:`, error.message);

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
        }, BATCH_DELAY_MS);
      }
    };

    const handleRealtimeChange = (payload) => {
      const { eventType, new: newRecord, old: oldRecord } = payload;

      if (eventType === "INSERT" || eventType === "UPDATE") {
        updateQueueRef.current.push({ id: newRecord.id, event: eventType });

        if (processingTimeoutRef.current) {
          clearTimeout(processingTimeoutRef.current);
        }

        processingTimeoutRef.current = setTimeout(() => {
          executeBatchQuery();
        }, BATCH_DELAY_MS);
      } else if (eventType === "DELETE") {
        onUpdateRef.current(null, oldRecord.id);
      }
    };

    const hardReconnect = async () => {
      if (reconnectingRef.current) return;
      reconnectingRef.current = true;

      try {
        cleanupChannel();

        try {
          await supabase.auth.getSession();
        } catch (_) {}
        try {
          await supabase.auth.refreshSession();
        } catch (_) {}
        try {
          supabase.realtime.disconnect();
        } catch (_) {}
        try {
          supabase.realtime.connect();
        } catch (_) {}

        createChannel();
      } finally {
        reconnectingRef.current = false;
      }
    };

    let currentStatus = "CLOSED";

    const createChannel = () => {
      cleanupChannel();

      const channel = supabase
        .channel(`realtime-depositos-${currentUser.id}`, {
          config: {
            broadcast: { self: false },
            presence: { key: currentUser.id },
          },
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "depositos" }, handleRealtimeChange)
        .subscribe((status, err) => {
          currentStatus = status;
          statusRef.current = status;
          setRealtimeStatus(status);

          if (status === "SUBSCRIBED") {
            setRealtimeErrors(0);
            return;
          }

          if (status === "CHANNEL_ERROR") {
            logger.error("Realtime channel error:", err);
          } else if (status === "TIMED_OUT") {
            logger.error("Realtime timeout de conexión");
          } else if (status === "CLOSED") {
            logger.log("Realtime canal cerrado");
          }

          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
            setRealtimeErrors((prev) => prev + 1);
            clearTimeout(retryTimeoutRef.current);
            retryTimeoutRef.current = setTimeout(() => {
              hardReconnect();
            }, RETRY_DELAY_MS);
          }
        });

      channelRef.current = channel;
    };

    const keepConnectionAlive = async () => {
      try {
        const { error } = await supabase.from("depositos").select("id").limit(1);
        return !error;
      } catch (_) {
        return false;
      }
    };

    const onVisibilityChange = async () => {
      if (document.visibilityState !== "visible") return;

      const isAlive = await keepConnectionAlive();
      if (!isAlive) {
        await hardReconnect();
        return;
      }

      if (currentStatus !== "SUBSCRIBED") {
        await hardReconnect();
      }
    };

    const onOnline = async () => {
      await hardReconnect();
    };

    createChannel();
    setRealtimeStatus("CONNECTING");

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
      clearTimeout(processingTimeoutRef.current);
      clearTimeout(retryTimeoutRef.current);
      cleanupChannel();
    };
  }, [currentUser, isSupabaseConnected]);

  return {
    realtimeStatus,
    realtimeErrors,
  };
};

export default useRealtimeDeposits;
