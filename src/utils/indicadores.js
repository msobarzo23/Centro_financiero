import { useQuery } from '@tanstack/react-query';

// mindicador.cl: API pública chilena, sin auth, actualiza una vez al día.
// Devuelve UF, USD, EUR, UTM, TPM, IPC, libra de cobre, etc.
const ENDPOINT = 'https://mindicador.cl/api';

async function fetchIndicadores() {
  const r = await fetch(ENDPOINT);
  if (!r.ok) throw new Error(`mindicador.cl respondió ${r.status}`);
  const data = await r.json();
  return {
    uf: data.uf?.valor ?? null,
    dolar: data.dolar?.valor ?? null,
    euro: data.euro?.valor ?? null,
    utm: data.utm?.valor ?? null,
    tpm: data.tpm?.valor ?? null,
    ipc: data.ipc?.valor ?? null,
    libraCobre: data.libra_cobre?.valor ?? null,
    fecha: data.fecha ?? null,
  };
}

// Valores se publican una vez al día, así que no tiene sentido refetch cada 5min.
// 1h de stale basta y evita golpear la API sin necesidad.
export function useIndicadores() {
  return useQuery({
    queryKey: ['indicadores'],
    queryFn: fetchIndicadores,
    staleTime: 60 * 60 * 1000,
    refetchInterval: 60 * 60 * 1000,
    retry: 1,
  });
}
