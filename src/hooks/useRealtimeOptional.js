import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';

export function useRealtimeOptional(tableName, onUpdate, isEnabled = true) {
  const channelRef = useRef(null);
  const [status, setStatus] = useState('UNSUBSCRIBED');

  useEffect(() => {
    if (!isEnabled || tableName !== 'depositos' || !supabase) {
      setStatus('DISABLED');
      return;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setStatus('CONNECTING');

    const channel = supabase
      .channel(`optional-depositos-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'depositos' },
        (payload) => {
          onUpdate?.(payload);
        }
      )
      .subscribe((nextStatus, error) => {
        if (nextStatus === 'SUBSCRIBED') {
          setStatus('SUBSCRIBED');
          return;
        }

        if (nextStatus === 'CHANNEL_ERROR' || nextStatus === 'TIMED_OUT' || nextStatus === 'CLOSED') {
          console.error('Error en el canal realtime de Supabase:', error || nextStatus);
          setStatus('CHANNEL_ERROR');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setStatus('UNSUBSCRIBED');
    };
  }, [tableName, onUpdate, isEnabled]);

  return {
    isSubscribed: status === 'SUBSCRIBED',
    status,
    channel: channelRef.current,
  };
}

export default useRealtimeOptional;
