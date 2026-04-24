/**
 * Serviço frontend para o painel Gerenciar RH.
 * Consome os endpoints do backend que fazem proxy para a API SIARHES.
 * As credenciais OAuth2 ficam exclusivamente no backend.
 */

export type SiarhesResumo = {
  total_colaboradores: number | null;
  estagiarios: number | null;
  comissionados: number | null;
  afastados: number | null;
  afastados_por_tipo: Record<string, number>;
  ferias_com_saldo: number | null;
  ferias_a_vencer: number | null;
  frequencias_pendentes: number | null;
  frequencias_detalhes?: {
    total_ativos: number | null;
    total_com_frequencia: number | null;
    mes_referencia: number | null;
    ano_referencia: number | null;
  };
  errors: {
    vinculos: string | null;
    afastados: string | null;
    ferias: string | null;
    frequencias?: string | null;
  };
};

const BACKEND_BASE = '/api/siarhes';
const TIMEOUT_MS   = 120_000; // SIARHES pode levar até ~60s na primeira consulta

async function get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${window.location.origin}${BACKEND_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const resp = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(tid);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json() as Promise<T>;
  } catch (err) {
    clearTimeout(tid);
    throw err;
  }
}

/** Busca o resumo completo do painel RH (vinculados + afastados + férias). */
export async function fetchSiarhesResumo(empresa?: number): Promise<SiarhesResumo> {
  const params = empresa ? { empresa } : {};
  return get<SiarhesResumo>('/resumo', params);
}

/** Dados pessoais de um servidor pelo número funcional. */
export async function fetchServidor(numfunc: number, empresa?: number) {
  return get('/servidor', { numfunc, ...(empresa ? { empresa } : {}) });
}

/** Vínculos de um servidor. */
export async function fetchVinculosServidor(numfunc: number, empresa?: number) {
  return get('/vinculos/servidor', { numfunc, ...(empresa ? { empresa } : {}) });
}

/** Férias (períodos aquisitivos) de um servidor. */
export async function fetchFeriasServidor(numfunc: number, empresa?: number) {
  return get('/ferias/servidor', { numfunc, ...(empresa ? { empresa } : {}) });
}

/** Licenças e afastamentos de um servidor. */
export async function fetchLicencasServidor(numfunc: number) {
  return get('/afastamentos/servidor', { numfunc });
}

/** Contracheque de um servidor para um mês/ano. */
export async function fetchContracheque(numfunc: number, ano: number, mes: number) {
  return get('/contracheque', { numfunc, ano, mes });
}
