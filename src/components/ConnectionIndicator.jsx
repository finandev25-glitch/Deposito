import React, { useState, useEffect } from "react";
import {
  CONNECTION_STATES,
  REALTIME_STATES,
  getConnectionStatusIcon,
  getConnectionStatusText,
  isOnline,
} from "../utils/connectionHelpers";

const ConnectionIndicator = ({
  supabaseConnected = false,
  realtimeStatus = null,
  realtimeErrors = 0,
  className = "",
}) => {
  const [networkOnline, setNetworkOnline] = useState(isOnline());

  // Escuchar cambios en el estado de red del navegador
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

  // Determinar el estado general de la conexión
  const getOverallStatus = () => {
    if (!networkOnline) {
      return CONNECTION_STATES.DISCONNECTED;
    }

    if (!supabaseConnected) {
      return CONNECTION_STATES.ERROR;
    }

    if (realtimeStatus === REALTIME_STATES.SUBSCRIBED && realtimeErrors < 3) {
      return CONNECTION_STATES.CONNECTED;
    }

    if (
      realtimeStatus === REALTIME_STATES.CHANNEL_ERROR ||
      realtimeStatus === REALTIME_STATES.TIMED_OUT ||
      realtimeErrors >= 3
    ) {
      return CONNECTION_STATES.ERROR;
    }

    return CONNECTION_STATES.CONNECTING;
  };

  const overallStatus = getOverallStatus();
  const icon = getConnectionStatusIcon(overallStatus);
  const text = getConnectionStatusText(overallStatus);

  // Determinar el color del indicador
  const getStatusColor = () => {
    switch (overallStatus) {
      case CONNECTION_STATES.CONNECTED:
        return "text-green-600";
      case CONNECTION_STATES.CONNECTING:
        return "text-yellow-600";
      case CONNECTION_STATES.DISCONNECTED:
      case CONNECTION_STATES.ERROR:
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <span className="text-lg">{icon}</span>
      <span className={`text-sm font-medium ${getStatusColor()}`}>{text}</span>

      {/* Mostrar detalles adicionales si hay problemas */}
      {(realtimeErrors > 0 || !networkOnline || !supabaseConnected) && (
        <div className="text-xs text-gray-500 ml-2">
          {!networkOnline && "(Sin internet)"}
          {!supabaseConnected && networkOnline && "(BD desconectada)"}
          {realtimeErrors > 0 && `(${realtimeErrors} errores RT)`}
        </div>
      )}
    </div>
  );
};

export default ConnectionIndicator;
