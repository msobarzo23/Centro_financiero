import { QueryClient } from '@tanstack/react-query';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

const CINCO_MIN = 5 * 60 * 1000;
const VEINTICUATRO_H = 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CINCO_MIN,
      gcTime: VEINTICUATRO_H,
      refetchInterval: CINCO_MIN,
      refetchOnWindowFocus: true,
      retry: 2,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    },
  },
});

export const localStoragePersister = createSyncStoragePersister({
  storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  key: 'cmf_tbello_query_cache',
  throttleTime: 1000,
});

// Limpia el cache manual anterior (pre-TanStack). Si quedan datos viejos,
// los removemos una vez para no ocupar espacio innecesario.
try {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cmf_tbello_v2_data');
    localStorage.removeItem('cmf_tbello_v2_ts');
  }
} catch {
  /* storage inaccesible */
}
