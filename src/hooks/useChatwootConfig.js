import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const useChatwootConfig = (configId) => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🔄 useChatwootConfig: Iniciando con configId:', configId, 'supabase:', !!supabase);

    if (!configId) {
      console.warn('⚠️ useChatwootConfig: configId no proporcionado');
      setLoading(false);
      setError('No se proporcionó ID de configuración');
      return;
    }

    if (!supabase) {
      console.error('❌ useChatwootConfig: Cliente Supabase no inicializado');
      setLoading(false);
      setError('Cliente Supabase no inicializado. Verifica las variables de entorno.');
      return;
    }

    const loadConfig = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log('🔍 useChatwootConfig: Buscando config con ID:', configId);

        const { data, error: supabaseError } = await supabase
          .from('chatwoot_config')
          .select('*')
          .eq('id', configId)
          .eq('activo', true)
          .limit(1);

        console.log('📊 useChatwootConfig: Resultado de consulta:', {
          data,
          error: supabaseError,
          dataLength: data?.length
        });

        if (supabaseError) {
          throw new Error(`Error cargando configuración: ${supabaseError.message}`);
        }

        if (!data || data.length === 0) {
          // Intentar sin el filtro activo para debug
          const { data: allData } = await supabase
            .from('chatwoot_config')
            .select('*')
            .eq('id', configId);

          console.warn('⚠️ No se encontró config activa. Todos los registros con ese ID:', allData);
          throw new Error('Configuración de Chatwoot no encontrada o inactiva');
        }

        // Tomar el primer resultado si hay múltiples
        console.log('✅ useChatwootConfig: Config encontrada:', data[0]);
        setConfig(data[0]);
      } catch (err) {
        console.error('❌ Error en useChatwootConfig:', err);
        setError(err.message);
        setConfig(null);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [configId]);

  return { config, loading, error };
};

export default useChatwootConfig;