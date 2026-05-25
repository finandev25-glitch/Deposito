import React, { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const ConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  // Verificar conexión a internet
  const checkInternetConnection = () => {
    return navigator.onLine;
  };

  // Verificar conexión a Supabase
  const checkSupabaseConnection = async () => {
    try {
      const response = await fetch("/api/connection/status");
      if (!response.ok) return false;
      const data = await response.json();
      return !!data.connected;
    } catch (error) {
      console.error(
        "❌ Error verificando conexión a Supabase:",
        error.message || error
      );
      return false;
    }
  };

  // Función para verificar conexión con reintentos
  const checkConnectionWithRetry = async (maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`🔄 Intento de conexión ${attempt}/${maxRetries}`);

      try {
        const supabaseOk = await checkSupabaseConnection();
        if (supabaseOk) {
          console.log("✅ Conexión exitosa");
          return true;
        }
      } catch (error) {
        console.log(`❌ Intento ${attempt} falló:`, error.message);
      }

      // Esperar antes del siguiente intento (excepto en el último)
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * attempt, 5000); // Backoff exponencial limitado
        console.log(`⏳ Esperando ${delay}ms antes del siguiente intento...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return false;
  };

  // Función para verificar ambas conexiones
  const checkConnection = async () => {
    const internetOk = checkInternetConnection();
    if (!internetOk) {
      console.log("❌ Sin conexión a internet");
      setIsOnline(false);
      setShowOverlay(true);
      return false;
    }

    console.log("🌐 Conexión a internet OK, verificando Supabase...");
    const supabaseOk = await checkConnectionWithRetry(2); // Solo 2 reintentos para no ser muy agresivo

    if (!supabaseOk) {
      console.log("❌ Fallo en conexión a Supabase después de reintentos");
      setIsOnline(false);
      setShowOverlay(true);
      return false;
    }

    console.log("✅ Todas las conexiones OK");
    setIsOnline(true);
    setShowOverlay(false);
    return true;
  };

  // Manejar reconexión
  const handleReconnect = async () => {
    try {
      setIsReconnecting(true);
      console.log("🔄 Intentando reconectar...");

      // Esperar un momento antes de verificar
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const connected = await checkConnection();

      if (connected) {
        console.log("✅ Reconexión exitosa");
        setIsOnline(true);
        setShowOverlay(false);
      } else {
        console.log("❌ Reconexión fallida");
        setIsOnline(false);
        setShowOverlay(true);
      }
    } catch (error) {
      console.error("❌ Error en reconexión:", error);
      setIsOnline(false);
      setShowOverlay(true);
    } finally {
      setIsReconnecting(false);
    }
  };

  // Escuchar eventos de conexión del navegador
  useEffect(() => {
    const handleOnline = () => {
      console.log("🌐 Navegador detectó conexión");
      checkConnection();
    };

    const handleOffline = () => {
      console.log("🔌 Navegador detectó desconexión");
      setIsOnline(false);
      setShowOverlay(true);
    };

    // Detectar cuando el usuario regresa a la página después de estar ausente
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Usuario regresó a la página
        console.log("👁️ Usuario regresó a la página - Verificando conexión...");
        setIsOnline(false);
        setShowOverlay(true);
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Verificar conexión inicial
    checkConnection();

    // Verificar conexión periódicamente cada 30 segundos
    const intervalId = setInterval(() => {
      if (!isOnline) {
        checkConnection();
      }
    }, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [isOnline]);

  return (
    <>
      {/* Overlay que bloquea la interacción cuando no hay conexión */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-md mx-4 text-center"
            >
              <div className="mb-6">
                <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <WifiOff className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Sin Conexión
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Se ha perdido la conexión con el servidor. Por favor, verifica
                  tu conexión a internet y presiona el botón para reconectar.
                </p>
              </div>

              <button
                onClick={handleReconnect}
                disabled={isReconnecting}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReconnecting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Reconectando...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>Reconectar</span>
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Indicador flotante de estado de conexión */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed bottom-6 right-6 z-[9999]"
      >
        <motion.button
          onClick={() => {
            if (!isOnline) {
              handleReconnect();
            }
          }}
          disabled={isReconnecting}
          className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${
            isOnline
              ? "bg-green-500 hover:bg-green-600 cursor-default"
              : "bg-red-500 hover:bg-red-600 cursor-pointer animate-pulse"
          } ${isReconnecting ? "opacity-50 cursor-not-allowed" : ""}`}
          whileHover={{ scale: isOnline ? 1 : 1.1 }}
          whileTap={{ scale: isOnline ? 1 : 0.95 }}
          title={
            isOnline
              ? "Conectado al servidor"
              : isReconnecting
              ? "Reconectando..."
              : "Sin conexión - Click para reconectar"
          }
        >
          <AnimatePresence mode="wait">
            {isReconnecting ? (
              <motion.div
                key="reconnecting"
                initial={{ rotate: 0, opacity: 0 }}
                animate={{ rotate: 360, opacity: 1 }}
                exit={{ rotate: 360, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <RefreshCw className="w-7 h-7 text-white animate-spin" />
              </motion.div>
            ) : isOnline ? (
              <motion.div
                key="online"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Wifi className="w-7 h-7 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="offline"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <WifiOff className="w-7 h-7 text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Tooltip */}
        <AnimatePresence>
          {!isOnline && !isReconnecting && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="absolute right-16 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg shadow-lg whitespace-nowrap"
            >
              Click para reconectar
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

export default ConnectionStatus;
