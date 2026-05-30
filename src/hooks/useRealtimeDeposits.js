import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import { logger } from "../utils/logger";

const RETRY_DELAY_MS = 3000;

export const useRealtimeDeposits = (
  isSupabaseConnected,
  currentUser,
  onInsert,
  onUpdate,
  onDelete,
  queryString,
  onReconnectRefresh
) => {
  const [realtimeStatus, setRealtimeStatus] = useState(null);
  const [realtimeErrors, setRealtimeErrors] = useState(0);

  const onInsertRef = useRef(onInsert);
  const onUpdateRef = useRef(onUpdate);
  const onDeleteRef = useRef(onDelete);
  const queryStringRef = useRef(queryString);
  const onReconnectRefreshRef = useRef(onReconnectRefresh);
  const statusRef = useRef("CLOSED");
  const channelRef = useRef(null);
  const reconnectingRef = useRef(false);
  const retryTimeoutRef = useRef(null);

  useEffect(() => {
    onInsertRef.current = onInsert;
    onUpdateRef.current = onUpdate;
    onDeleteRef.current = onDelete;
    queryStringRef.current = queryString;
    onReconnectRefreshRef.current = onReconnectRefresh;
  }, [onInsert, onUpdate, onDelete, queryString, onReconnectRefresh]);

  useEffect(() => {
    if (!isSupabaseConnected || !currentUser || !supabase) {
      return;
    }

    let isMounted = true;

    const cleanupChannel = () => {
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch (error) {
          logger.error("Error closing realtime channel:", error.message);
        }
        channelRef.current = null;
      }
    };

    const handleRealtimeChange = (payload) => {
      if (!isMounted) return;
      const { eventType, new: newRecord, old: oldRecord } = payload;
      const recordId = newRecord?.id || oldRecord?.id;



      if (eventType === "INSERT") {
        console.log("➕ REALTIME: Nuevo depósito creado:", recordId);
        console.log("📋 REALTIME: Estado del depósito:", newRecord?.estado);
        console.log("🔄 REALTIME: Llamando refreshDeposits para INSERT...");
        if (onInsertRef.current) {
          onInsertRef.current(newRecord);
        }
      } else if (eventType === "UPDATE") {
        console.log("🔄 REALTIME: Depósito actualizado:", recordId);

        // Consultar de inmediato el registro completo con todas sus relaciones
        (async () => {
          try {
            console.log("📡 REALTIME: Consultando depósito completo por ID:", recordId);
            
            const queryPromise = supabase
              .from("depositos")
              .select(queryStringRef.current)
              .eq("id", recordId)
              .limit(1);

            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Timeout en query realtime")), 10000)
            );

            const { data: fullDepositRows, error } = await Promise.race([queryPromise, timeoutPromise]);

            if (error) throw error;

            const fullDeposit = Array.isArray(fullDepositRows)
              ? fullDepositRows[0] || null
              : fullDepositRows || null;

            console.log("✅ REALTIME: Depósito completo obtenido con relaciones:", {
              id: fullDeposit?.id,
              estado: fullDeposit?.estado,
            });

            if (onUpdateRef.current) {
              onUpdateRef.current(fullDeposit);
            }
          } catch (error) {
            logger.error(`❌ REALTIME: Error obteniendo depósito completo, usando fallback:`, error.message);
            // Fallback: usar los datos básicos del payload en tiempo real
            if (onUpdateRef.current) {
              onUpdateRef.current(newRecord);
            }
          }
        })();
      } else if (eventType === "DELETE") {
        console.log("🗑️ REALTIME: Depósito eliminado:", recordId);
        if (onDeleteRef.current) {
          onDeleteRef.current(oldRecord.id);
        }
      }

      console.log(`📨 REALTIME: Cambio detectado en depositos: ${eventType}`);
      console.log("📦 REALTIME: Payload completo:", payload);
    };

    const hardReconnect = async () => {
      if (!isMounted) return;
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
          supabase?.realtime?.disconnect?.();
        } catch (_) {}
        try {
          supabase?.realtime?.connect?.();
        } catch (_) {}

        createChannel();

        if (onReconnectRefreshRef.current) {
          console.log("🔄 REALTIME: Rehidratando vista tras reconexión...");
          await onReconnectRefreshRef.current();
        }
      } finally {
        reconnectingRef.current = false;
      }
    };

    let currentStatus = "CLOSED";

    const createChannel = () => {
      cleanupChannel();

      const channelName = `realtime-depositos-${currentUser.id}`;
      const channel = supabase
        .channel(channelName, {
          config: {
            broadcast: { self: false },
            presence: { key: currentUser.id },
          },
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "depositos" }, handleRealtimeChange)
        .subscribe((status, err) => {
          if (!isMounted) return;
          currentStatus = status;
          statusRef.current = status;
          setRealtimeStatus(status);

          if (status === "SUBSCRIBED") {
            console.log("✅ REALTIME: Canal suscrito a depositos");
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
      if (!isMounted) return;
      if (document.visibilityState !== "visible") return;

      const isAlive = await keepConnectionAlive();
      if (!isAlive) {
        await hardReconnect();
        return;
      }

      if (currentStatus !== "SUBSCRIBED") {
        await hardReconnect();
        return;
      }

      if (onReconnectRefreshRef.current) {
        console.log("👁️ REALTIME: Rehidratando vista al volver visible...");
        try {
          await onReconnectRefreshRef.current();
        } catch (error) {
          logger.error("Error al rehidratar vista al volver visible:", error.message);
        }
      }
    };

    const onOnline = async () => {
      if (!isMounted) return;
      await hardReconnect();
      if (onReconnectRefreshRef.current) {
        console.log("🌐 REALTIME: Rehidratando vista tras volver la red...");
        try {
          await onReconnectRefreshRef.current();
        } catch (error) {
          logger.error("Error al rehidratar vista tras volver la red:", error.message);
        }
      }
    };

    const keepAliveInterval = setInterval(async () => {
      const isAlive = await keepConnectionAlive();
      if (!isAlive && document.visibilityState === "visible") {
        await hardReconnect();
      }
    }, 2 * 60 * 1000);

    createChannel();
    setRealtimeStatus("CONNECTING");

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
      clearInterval(keepAliveInterval);
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
