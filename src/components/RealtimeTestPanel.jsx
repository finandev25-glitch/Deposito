import React, { useState, useCallback } from 'react';
import { useRealtimeOptional } from '../hooks/useRealtimeOptional';

/**
 * Panel de prueba para verificar el estado de Realtime
 *
 * INSTRUCCIONES:
 * 1. Importar este componente en App.jsx
 * 2. Agregarlo temporalmente a la interfaz
 * 3. Activar/desactivar Realtime con el botón
 * 4. Ver los logs en consola
 */
export default function RealtimeTestPanel() {
  const [isRealtimeEnabled, setIsRealtimeEnabled] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Callback cuando Realtime detecta un cambio
  const handleRealtimeUpdate = useCallback((payload) => {
    console.log('🔔 Panel Test: Cambio detectado:', payload);

    setLastUpdate({
      event: payload.eventType,
      timestamp: new Date().toLocaleTimeString(),
      data: payload.new || payload.old,
    });
  }, []);

  // Hook de Realtime (intentará conectar si isRealtimeEnabled es true)
  const { isSubscribed, status } = useRealtimeOptional(
    'depositos',
    handleRealtimeUpdate,
    isRealtimeEnabled
  );

  // Alternar Realtime on/off
  const toggleRealtime = () => {
    setIsRealtimeEnabled(!isRealtimeEnabled);
    setLastUpdate(null);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 9999,
      minWidth: '300px',
      maxWidth: '400px',
    }}>
      <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold' }}>
        🔌 Realtime Test Panel
      </h3>

      <div style={{ marginBottom: '12px' }}>
        <button
          onClick={toggleRealtime}
          style={{
            padding: '8px 16px',
            background: isRealtimeEnabled ? '#ef4444' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            width: '100%',
            fontWeight: '500',
          }}
        >
          {isRealtimeEnabled ? '🔴 Desactivar Realtime' : '🟢 Activar Realtime'}
        </button>
      </div>

      <div style={{
        padding: '12px',
        background: '#f8fafc',
        borderRadius: '6px',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}>
        <div style={{ marginBottom: '8px' }}>
          <strong>Estado:</strong>{' '}
          <span style={{
            color: isSubscribed ? '#10b981' : '#ef4444',
            fontWeight: 'bold',
          }}>
            {status}
          </span>
        </div>

        <div style={{ marginBottom: '8px' }}>
          <strong>Conectado:</strong>{' '}
          {isSubscribed ? '✅ Sí' : '❌ No'}
        </div>

        {lastUpdate && (
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: '#fff',
            borderRadius: '4px',
            border: '1px solid #e2e8f0',
          }}>
            <div><strong>Último cambio:</strong></div>
            <div>Evento: {lastUpdate.event}</div>
            <div>Hora: {lastUpdate.timestamp}</div>
            {lastUpdate.data && (
              <div style={{ marginTop: '4px', fontSize: '10px', color: '#64748b' }}>
                ID: {lastUpdate.data.id}
              </div>
            )}
          </div>
        )}

        {!isRealtimeEnabled && (
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: '#fef3c7',
            borderRadius: '4px',
            fontSize: '11px',
          }}>
            ⚠️ Realtime desactivado. Actívalo para probar.
          </div>
        )}

        {isRealtimeEnabled && !isSubscribed && (
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: '#fee2e2',
            borderRadius: '4px',
            fontSize: '11px',
          }}>
            ❌ Error: WebSocket no puede conectar (probablemente error 503).
            Revisa la consola para más detalles.
          </div>
        )}

        {isSubscribed && (
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: '#d1fae5',
            borderRadius: '4px',
            fontSize: '11px',
          }}>
            ✅ Realtime funcionando! Intenta modificar un depósito para ver cambios en tiempo real.
          </div>
        )}
      </div>

      <div style={{
        marginTop: '12px',
        padding: '8px',
        background: '#eff6ff',
        borderRadius: '4px',
        fontSize: '10px',
        color: '#1e40af',
      }}>
        💡 <strong>Tip:</strong> Abre la consola del navegador para ver logs detallados de Realtime
      </div>
    </div>
  );
}
