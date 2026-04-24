/**
 * Serviço frontend para o painel Gerenciar RH.
 * Consome os endpoints do backend que fazem proxy para a API SIARHES.
 * As credenciais OAuth2 ficam exclusivamente no backend.
 */

export type ServidorItem = {
  numfunc: number | null;
  nome: string;
  tipoVinculo?: string;
  categoria?: string;
};

export type AfastadoItem = {
  numfunc: number | null;
  nome: string;
  tipo: string;
  dataInicio: string;
  dataTermino: string;
};

export type FeriasItem = {
  numfunc: number | null;
  nome: string;
  saldo: number;
  prescricao: string | null;
};

export type SiarhesResumo = {
  total_colaboradores: number | null;
  estagiarios: number | null;
  comissionados: number | null;
  afastados: number | null;
  afastados_por_tipo: Record<string, number>;
  ferias_com_saldo: number | null;
  ferias_a_vencer: number | null;
  frequencias_pendentes: number | null;
  /** ISO 8601 UTC — quando o cache do backend foi gerado */
  cache_at: string | null;
  frequencias_detalhes?: {
    total_ativos: number | null;
    total_com_frequencia: number | null;
    mes_referencia: number | null;
    ano_referencia: number | null;
  };
  /** Listas para exibição nos modais dos cards */
  colaboradores_lista?: ServidorItem[];
  afastados_lista?: AfastadoItem[];
  ferias_lista?: FeriasItem[];
  ferias_a_vencer_lista?: FeriasItem[];
  pendentes_frequencia_lista?: { numfunc: number | null; nome: string }[];
  errors: {
    vinculos: string | null;
    afastados: string | null;
    ferias: string | null;
    frequencias?: string | null;
  };
};

const BACKEND_BASE = '/api/siarhes';
const TIMEOUT_MS   = 60_000; // cold start pode levar 30-50s (token + 3 chamadas + 12k registros frequências)

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

export type FrequenciasMes = {
  total_ativos: number;
  total_com_frequencia: number;
  frequencias_pendentes: number;
  mes_referencia: number;
  ano_referencia: number;
  pendentes_lista: { numfunc: number | null; nome: string }[];
};

export type ProgressaoCarreira = {
  // Identificação
  numfunc: number;
  nome: string;
  funcao: string;
  cargo: string;          // alias de funcao (legado)
  categoria: string;
  situacao: string;
  // Vínculo
  tipo_vinculo: string;
  regime_juridico: string;
  regime_previdenciario: string;
  tipo_de_onus: string;
  // Lotação / Requisição
  orgao: string;
  tipo_de_orgao: string;
  tipo_de_requis: string;
  tipo_de_ressarcimento: string;
  categ_org_origem: string;
  empresa: string;
  secretaria: string;
  // Datas
  data_nomeacao: string | null;
  data_posse: string | null;
  data_exercicio: string | null;
  data_exerc_org_origem: string | null;
  data_inicio_contrato: string | null;
  data_termino_contrato: string | null;
  data_prorrogacao: string | null;
  dt_concurso: string | null;
  data_admissao: string | null;   // alias legado
  // Extras
  matricula_esocial: string;
  numero_vinculo: number | null;
  fone: string;
  // Meta
  vinculo_raw: Record<string, unknown>;
  vinculo_ativo?: null;
  mensagem?: string;
  erro?: string;
};

/** Progressão de carreira de um servidor pelo número funcional ou nome. */
export async function fetchProgressaoCarreira(params: { numfunc?: number; nome?: string }, empresa?: number): Promise<ProgressaoCarreira> {
  return get<ProgressaoCarreira>('/carreira/progressao', {
    ...(params.numfunc !== undefined ? { numfunc: params.numfunc } : {}),
    ...(params.nome ? { nome: params.nome } : {}),
    ...(empresa ? { empresa } : {}),
  });
}

/** Análise de frequências para um mês/ano específico. */
export async function fetchFrequenciasPorMes(ano: number, mes: number, empresa?: number): Promise<FrequenciasMes> {
  return get<FrequenciasMes>('/frequencias/por-mes', { ano, mes, ...(empresa ? { empresa } : {}) });
}

// ── Capacitações / Desenvolvimento Profissional ──────────────────────────────

export type CapacitacaoItem = {
  sigla: string;
  nome_evento: string;
  data_inicio: string | null;
  data_fim: string | null;
  carga_horaria: number | null;
  entidade: string;
  pontos: number | null;
  num_bi_ato: string;
  data_bi: string | null;
};

/** Histórico de capacitações/cursos — aceita numfunc OU nome. */
export async function fetchCapacitacoes(
  params: { numfunc?: number; nome?: string },
  empresa?: number,
): Promise<CapacitacaoItem[]> {
  return get<CapacitacaoItem[]>('/carreira/capacitacoes', {
    ...(params.numfunc !== undefined ? { numfunc: params.numfunc } : {}),
    ...(params.nome ? { nome: params.nome } : {}),
    ...(empresa ? { empresa } : {}),
  });
}
