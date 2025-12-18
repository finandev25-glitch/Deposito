import React, { useState, useEffect } from "react";
import { X, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { getFriendlyErrorMessage, isOnline } from "../utils/connectionHelpers";

const ConnectionNotification = ({
  show = false,
  onDismiss = () => {},
  onReconnect = () => {},
  error = null,
  realtimeErrors = 0,
  isReconnecting = false,
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [networkOnline, setNetworkOnline] = useState(isOnline());

  // Resetear dismissed cuando cambia el estado show
  useEffect(() => {
    if (show) {
      setDismissed(false);
    }
  }, [show]);

  // Escuchar cambios en el estado de red
  useEffect(() => {
    const handleOnline = () => setNetworkOnline(true);
    const handleOffline = () => setNetworkOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss();
  };

  const handleReconnect = () => {
    onReconnect();
  };

  // No mostrar si está dismissed o no debe mostrarse
  if (!show || dismissed) return null;

  // Determinar el tipo de problema y mensaje
  const getNotificationContent = () => {
    if (!networkOnline) {
      return {
        icon: <WifiOff className="text-red-500" size={20} />,
        title: "Sin conexión a Internet",
        message: "Verifica tu conexión de red para continuar.",
        color: "border-red-500 bg-red-50",
        titleColor: "text-red-800",
        messageColor: "text-red-700",
      };
    }

    if (realtimeErrors >= 3) {
      return {
        icon: <RefreshCw className="text-orange-500" size={20} />,
        title: "Problemas de conexión en tiempo real",
        message: `Se han detectado ${realtimeErrors} errores consecutivos. Los cambios pueden no actualizarse automáticamente.`,
        color: "border-orange-500 bg-orange-50",
        titleColor: "text-orange-800",
        messageColor: "text-orange-700",
      };
    }

    if (error) {
      const friendlyMessage = getFriendlyErrorMessage(error);
      return {
        icon: <Wifi className="text-yellow-500" size={20} />,
        title: "Problema de conexión",
        message: friendlyMessage,
        color: "border-yellow-500 bg-yellow-50",
        titleColor: "text-yellow-800",
        messageColor: "text-yellow-700",
      };
    }

    return null;
  };

  const content = getNotificationContent();
  if (!content) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm w-full">
      <div className={`rounded-lg border-l-4 ${content.color} p-4 shadow-lg`}>
        <div className="flex">
          <div className="flex-shrink-0">{content.icon}</div>
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${content.titleColor}`}>
              {content.title}
            </h3>
            <p className={`mt-1 text-xs ${content.messageColor}`}>
              {content.message}
            </p>

            {/* Botones de acción */}
            <div className="mt-3 flex space-x-2">
              {!isReconnecting && (networkOnline || error) && (
                <button
                  onClick={handleReconnect}
                  className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                    content.color.includes("red")
                      ? "text-red-800 bg-red-100 hover:bg-red-200"
                      : content.color.includes("orange")
                      ? "text-orange-800 bg-orange-100 hover:bg-orange-200"
                      : "text-yellow-800 bg-yellow-100 hover:bg-yellow-200"
                  } transition-colors`}
                >
                  <RefreshCw size={12} className="mr-1" />
                  Reconectar
                </button>
              )}

              {isReconnecting && (
                <div className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-600">
                  <RefreshCw size={12} className="mr-1 animate-spin" />
                  Reconectando...
                </div>
              )}
            </div>
          </div>

          {/* Botón cerrar */}
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                content.color.includes("red")
                  ? "text-red-400 hover:bg-red-100 focus:ring-red-600"
                  : content.color.includes("orange")
                  ? "text-orange-400 hover:bg-orange-100 focus:ring-orange-600"
                  : "text-yellow-400 hover:bg-yellow-100 focus:ring-yellow-600"
              }`}
            >
              <span className="sr-only">Cerrar</span>
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionNotification;
