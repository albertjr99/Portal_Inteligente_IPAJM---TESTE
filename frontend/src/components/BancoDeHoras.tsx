import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, RefreshCw, User, XCircle } from 'lucide-react';
import { Button } from './ui/button';
import type { DiaTrabalhado } from '@/types/bancoHoras';
import {
  parseMinutes, minsToLabel, fmtDate, daysUntil,
} from '@/utils/bancoHorasHelpers';
import { fetchBancoHorasPorNome } from '@/services/bancoHorasService';

interface BancoDeHorasProps {
  fullName: string;
}

export function BancoDeHoras({ fullName }: BancoDeHorasProps) {
  const [registros, setRegistros] = useState<DiaTrabalhado[]>([]);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const fetchDados = useCallback(async () => {
    if (!fullName) return;

    setLoading(true);
    setErro(null);

    try {
      const lista = await fetchBancoHorasPorNome(fullName);
      setRegistros(lista);
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  }, [fullName]);

  useEffect(() => {
    fetchDados();
  }, [fetchDados]);

  const servidor = registros[0];
  
  const totalHDireito = registros.reduce((s, r) => s + parseMinutes(r.h_direito), 0);
  const totalDescontadas = registros.reduce((s, r) => s + parseMinutes(r.h_descontadas), 0);
  const saldoTotal = totalHDireito - totalDescontadas;

  const proxPrazo = [...registros]
    .filter(r => r.prazo_max && (daysUntil(r.prazo_max) ?? 0) >= 0)
    .sort((a, b) => (a.prazo_max ?? '').localeCompare(b.prazo_max ?? ''))[0]?.prazo_max;

  return (
    <div className="space-y-5">
      <AnimatePresence mode="wait">

        {/* LOADING */}
        {loading && (
          <motion.div key="loading" className="flex flex-col items-center gap-4 py-12">
            <Clock className="size-6 text-rose-600 animate-spin" />
            <p className="text-sm font-semibold">Carregando seus dados...</p>
          </motion.div>
        )}

        {/* ERRO */}
        {!loading && erro && (
          <motion.div key="erro" className="flex flex-col items-center gap-4 py-10 text-center">
            <XCircle className="size-6 text-red-600" />
            <p className="font-bold text-sm">Não foi possível carregar</p>
            <p className="text-xs text-muted-foreground">{erro}</p>

            <Button onClick={fetchDados}>
              <RefreshCw className="size-4" /> Tentar novamente
            </Button>
          </motion.div>
        )}

        {/* DASHBOARD */}
        {!loading && !erro && registros.length > 0 && (
          <motion.div key="dashboard" className="space-y-5">

            {/* HEADER */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50">
                <User className="size-4 text-rose-600" />
                <span className="text-xs font-semibold">{servidor?.nome}</span>
              </div>

              <Button onClick={fetchDados}>
                <RefreshCw className="size-4" />
              </Button>
            </div>

            {/* RESUMO */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard label="Saldo" value={minsToLabel(saldoTotal)} />
              <SummaryCard label="Direito" value={minsToLabel(totalHDireito)} />
              <SummaryCard label="Utilizadas" value={minsToLabel(totalDescontadas)} />
              <SummaryCard label="Vencimento" value={proxPrazo ? fmtDate(proxPrazo) : '-'} />
            </div>

          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl border">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  );
}