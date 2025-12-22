import { QueryClient } from '@tanstack/react-query';

// Configuración del QueryClient con reconexión automática
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Desactivado para evitar refetch automático al regresar al foco
      refetchOnWindowFocus: false,

      // Refetch cuando se reconecta la red
      refetchOnReconnect: true,

      // Mantener datos en caché por 5 minutos
      staleTime: 5 * 60 * 1000,

      // Cachear por 10 minutos
      cacheTime: 10 * 60 * 1000,

      // Reintentar 3 veces en caso de error
      retry: 3,

      // Intervalo entre reintentos (1s, 2s, 4s)
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
