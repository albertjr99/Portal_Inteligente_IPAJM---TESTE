const SRH_BASE = 'https://srh.pythonanywhere.com';

// ─── Public types ────────────────────────────────────────────────────────────

export type GerencialResumo = {
  total_servidores: number;
  registros_horas: number;
  horas_trabalhadas_hhmm: string;
  horas_direito_hhmm: string;
  horas_gozadas_hhmm: string;
  saldo_total_hhmm: string;
};

export type GerencialHorasMes = {
  month: string;
  liquidadas: number;
  direito: number;
  perdidas: number;
};

export type GerencialSaldoSetor = {
  setor: string;
  saldo: number;
};

export type GerencialTopServidor = {
  id: string;
  nome: string;
  setor: string;
  saldo_hhmm: string;
};

export type GerencialDashboard = {
  summary: GerencialResumo;
  horas_por_mes: GerencialHorasMes[];
  saldo_por_setor: GerencialSaldoSetor[];
  top_servidores: GerencialTopServidor[];
};

export type GerencialFilters = {
  dateFrom?: string;
  dateTo?: string;
  setor?: string;
  username?: string;
};

export type NovoRegistroHorasPayload = {
  /** NF / matrícula do servidor (campo 'nf' no SRH) */
  username: string;
  nome?: string;
  setor?: string;
  dia_trabalhado: string;
  entrada: string;
  saida: string;
  observacao?: string;
};

export type ServidorSugestao = {
  username: string;
  setor: string;
  nome?: string;
};

// ─── Internal SRH types ──────────────────────────────────────────────────────

type SRHDia = {
  id: number;
  nf: string | null;
  nome: string;
  setor: string;
  dia_trabalhado: string;
  h_trabalhada: string;
  h_direito: string;
  horas_descontadas: string | null;
};

type SRHServidor = {
  id: number;
  nf: string;
  nome: string;
  setor: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hhmmToMin(value: string | null | undefined): number {
  if (!value || typeof value !== 'string') return 0;
  const t = value.trim();
  if (!t.includes(':')) return 0;
  const [h, m] = t.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

function minToHhmm(minutes: number): string {
  const sign = minutes < 0 ? '-' : '';
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

function buildQuery(filters: GerencialFilters): string {
  const params = new URLSearchParams();
  if (filters.dateFrom) params.set('date_from', filters.dateFrom);
  if (filters.dateTo) params.set('date_to', filters.dateTo);
  if (filters.setor && filters.setor !== 'todos') params.set('setor', filters.setor);
  if (filters.username && filters.username !== 'todos') params.set('username', filters.username);
  const q = params.toString();
  return q ? `?${q}` : '';
}

// ─── SRH direct aggregation (client-side) ────────────────────────────────────

async function fetchSRHDias(): Promise<SRHDia[]> {
  const resp = await fetch(`${SRH_BASE}/api/dias-trabalhados`);
  if (!resp.ok) throw new Error('Falha ao buscar dados do SRH');
  return resp.json();
}

function aggregateSRH(data: SRHDia[], filters: GerencialFilters): GerencialDashboard {
  const filtered = data.filter(r => {
    if (filters.dateFrom && r.dia_trabalhado < filters.dateFrom) return false;
    if (filters.dateTo && r.dia_trabalhado > filters.dateTo) return false;
    if (filters.setor && filters.setor !== 'todos' && r.setor !== filters.setor) return false;
    if (filters.username && filters.username !== 'todos' && r.nf !== filters.username) return false;
    return true;
  });

  const totalTrab = filtered.reduce((s, r) => s + hhmmToMin(r.h_trabalhada), 0);
  const totalDir = filtered.reduce((s, r) => s + hhmmToMin(r.h_direito), 0);
  const totalDesc = filtered.reduce((s, r) => s + hhmmToMin(r.horas_descontadas), 0);
  const uniqueIds = new Set(filtered.map(r => r.nf ?? String(r.id)));

  const summary: GerencialResumo = {
    total_servidores: uniqueIds.size,
    registros_horas: filtered.length,
    horas_trabalhadas_hhmm: minToHhmm(totalTrab),
    horas_direito_hhmm: minToHhmm(totalDir),
    horas_gozadas_hhmm: minToHhmm(totalDesc),
    saldo_total_hhmm: minToHhmm(totalDir - totalDesc),
  };

  // Monthly series
  const monthMap: Record<string, { liquidadas: number; direito: number; perdidas: number }> = {};
  for (const r of filtered) {
    const m = r.dia_trabalhado.slice(0, 7);
    if (!monthMap[m]) monthMap[m] = { liquidadas: 0, direito: 0, perdidas: 0 };
    monthMap[m].liquidadas += hhmmToMin(r.h_trabalhada);
    monthMap[m].direito += hhmmToMin(r.h_direito);
    monthMap[m].perdidas += hhmmToMin(r.horas_descontadas);
  }
  const horas_por_mes: GerencialHorasMes[] = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({
      month,
      liquidadas: Math.round((v.liquidadas / 60) * 100) / 100,
      direito: Math.round((v.direito / 60) * 100) / 100,
      perdidas: Math.round((v.perdidas / 60) * 100) / 100,
    }));

  // Saldo por setor
  const setorMap: Record<string, number> = {};
  for (const r of filtered) {
    const setor = (r.setor || 'SEM SETOR').trim();
    setorMap[setor] = (setorMap[setor] ?? 0) + hhmmToMin(r.h_direito) - hhmmToMin(r.horas_descontadas);
  }
  const saldo_por_setor: GerencialSaldoSetor[] = Object.entries(setorMap)
    .sort(([, a], [, b]) => b - a)
    .map(([setor, saldoMin]) => ({ setor, saldo: Math.round((saldoMin / 60) * 100) / 100 }));

  // Top 10 servidores
  const servidorMap: Record<string, { nome: string; setor: string; saldo: number }> = {};
  for (const r of filtered) {
    const key = r.nf ?? String(r.id);
    if (!servidorMap[key]) servidorMap[key] = { nome: r.nome.trim(), setor: (r.setor || 'SEM SETOR').trim(), saldo: 0 };
    servidorMap[key].saldo += hhmmToMin(r.h_direito) - hhmmToMin(r.horas_descontadas);
  }
  const top_servidores: GerencialTopServidor[] = Object.entries(servidorMap)
    .sort(([, a], [, b]) => b.saldo - a.saldo)
    .slice(0, 10)
    .map(([id, info]) => ({
      id,
      nome: info.nome,
      setor: info.setor,
      saldo_hhmm: minToHhmm(info.saldo),
    }));

  return { summary, horas_por_mes, saldo_por_setor, top_servidores };
}

// ─── Public API functions ─────────────────────────────────────────────────────

/**
 * Busca dados gerenciais.
 * Tenta o backend local primeiro (que mescla MySQL + SRH).
 * Se o backend não estiver disponível, agrega diretamente do SRH.
 */
export async function fetchGerencialDashboard(filters: GerencialFilters): Promise<GerencialDashboard> {
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`/api/banco-horas/gerencial/dashboard${buildQuery(filters)}`, {
      signal: controller.signal,
    });
    clearTimeout(tid);
    if (response.ok) return response.json();
  } catch {
    // backend indisponível — continua para fallback
  }

  // Fallback: agrega diretamente do SRH PythonAnywhere
  const data = await fetchSRHDias();
  return aggregateSRH(data, filters);
}

export async function createRegistroHoras(payload: NovoRegistroHorasPayload): Promise<void> {
  // Tenta POST direto no SRH (fonte primária de dados)
  try {
    const srhBody = {
      nf: payload.username,
      nome: payload.nome ?? payload.username,
      setor: payload.setor ?? '',
      dia_trabalhado: payload.dia_trabalhado,
      entrada: payload.entrada,
      saida: payload.saida,
      hora_dia: '08:00',
      observacao: payload.observacao ?? '',
    };
    const srhResp = await fetch(`${SRH_BASE}/api/dias-trabalhados`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(srhBody),
    });
    if (srhResp.ok) return;
    // SRH retornou erro HTTP — tenta backend local antes de desistir
    const srhErr = await srhResp.json().catch(() => null);
    const srhMsg = srhErr?.detail ?? srhErr?.error ?? srhErr?.message ?? null;
    // Se for 4xx (dado inválido), lança imediatamente
    if (srhResp.status >= 400 && srhResp.status < 500) {
      throw new Error(srhMsg ?? 'Dados inválidos para o SRH.');
    }
  } catch (err) {
    // Se for o erro que lançamos acima (4xx), repropaga
    if (err instanceof Error && err.message !== 'Dados inválidos para o SRH.') {
      // Problema de rede/CORS — cai para backend local
    } else if (err instanceof Error) {
      throw err;
    }
  }

  // Fallback: backend local FastAPI
  const response = await fetch('/api/banco-horas/dias-trabalhados', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail ?? 'Nao foi possivel salvar o novo registro. Verifique se o servidor local está ativo.');
  }
}

/**
 * Busca sugestões de servidor para autocomplete.
 * Tenta backend local; fallback para /api/servidores do SRH.
 */
export async function fetchServidores(q: string): Promise<ServidorSugestao[]> {
  try {
    const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : '';
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`/api/banco-horas/servidores${params}`, { signal: controller.signal });
    clearTimeout(tid);
    if (response.ok) return response.json();
  } catch {
    // fallthrough
  }

  // Fallback: lista servidores do SRH
  const resp = await fetch(`${SRH_BASE}/api/servidores`);
  if (!resp.ok) return [];
  const data: SRHServidor[] = await resp.json();
  const lower = q.trim().toLowerCase();
  return data
    .filter(s => !lower || s.nome.toLowerCase().includes(lower) || s.nf.includes(lower))
    .slice(0, 20)
    .map(s => ({ username: s.nf, setor: s.setor, nome: s.nome }));
}
