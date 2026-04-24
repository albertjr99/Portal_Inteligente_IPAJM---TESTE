import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { BancoDeHoras } from '@/components/BancoDeHoras';
import { useAuth } from '@/contexts/AuthContext';
import { mockHRHighlights } from '@/data/mockData';
import { formatDate } from '@/utils/helpers';
import { fetchProgressaoCarreira, fetchCapacitacoes, type ProgressaoCarreira, type CapacitacaoItem } from '@/services/siarhesService';
import {
  Heart,
  Briefcase,
  GraduationCap,
  TrendingUp,
  Calendar,
  Users,
  Award,
  Gift,
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Clock,
  X,
  LayoutDashboard,
  Settings2,
  Loader2,
  AlertCircle,
  BookOpen,
  Sparkles,
  GraduationCap as GraduationCapIcon,
  Clock3,
  Building2,
} from 'lucide-react';

import { router } from '@/routes/routes';

export function HRPage() {
  const { currentUser } = useAuth();
  const [modalAberto, setModalAberto] = useState(false);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const [progressaoAberta, setProgressaoAberta] = useState(false);
  const [progressaoData, setProgressaoData] = useState<ProgressaoCarreira | null>(null);
  const [progressaoLoading, setProgressaoLoading] = useState(false);
  const [progressaoErro, setProgressaoErro] = useState<string | null>(null);

  // ── Desenvolvimento Profissional (capacitações) ──────────────────────────
  const [devAberto, setDevAberto] = useState(false);
  const [devData, setDevData] = useState<CapacitacaoItem[] | null>(null);
  const [devLoading, setDevLoading] = useState(false);
  const [devErro, setDevErro] = useState<string | null>(null);

  const abrirDesenvolvimento = async () => {
    if (!currentUser) return;
    setDevAberto(true);
    if (devData !== null) return; // já carregado
    setDevLoading(true);
    setDevErro(null);
    try {
      // Backend resolve numfunc via cache quando username não é numérico
      const numfuncParsed = parseInt(currentUser.username, 10);
      const params = !isNaN(numfuncParsed)
        ? { numfunc: numfuncParsed }
        : { nome: currentUser.fullName };
      const data = await fetchCapacitacoes(params);
      setDevData(data);
    } catch (e) {
      setDevErro(e instanceof Error ? e.message : 'Erro ao buscar capacitações');
    } finally {
      setDevLoading(false);
    }
  };

  const abrirProgressao = async () => {
    if (!currentUser) return;
    setProgressaoAberta(true);
    if (progressaoData) return; // já carregado
    setProgressaoLoading(true);
    setProgressaoErro(null);
    try {
      // Tenta numfunc (username numérico do AD), senão usa o nome completo
      const numfuncParsed = parseInt(currentUser.username, 10);
      const params = !isNaN(numfuncParsed)
        ? { numfunc: numfuncParsed }
        : { nome: currentUser.fullName };
      const data = await fetchProgressaoCarreira(params);
      if (data.erro) throw new Error(data.erro);
      setProgressaoData(data);
    } catch (e) {
      setProgressaoErro(e instanceof Error ? e.message : 'Erro ao buscar dados do SIARHES');
    } finally {
      setProgressaoLoading(false);
    }
  };

  const fmtDataBR = (iso: string | null | undefined) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const benefits = [
    { icon: Gift,     title: 'Vale Alimentação',  description: 'R$ 800,00 mensais em cartão alimentação',  color: 'bg-rose-50 border-rose-100 text-rose-600' },
    { icon: Heart,    title: 'Plano de Saúde',    description: 'Cobertura nacional com coparticipação',    color: 'bg-pink-50 border-pink-100 text-pink-600' },
    { icon: Calendar, title: 'Vale Transporte',   description: 'Custeio de deslocamento casa-trabalho',   color: 'bg-orange-50 border-orange-100 text-orange-600' },
    { icon: Users,    title: 'Auxílio Creche',    description: 'Até R$ 500,00 para filhos até 6 anos',    color: 'bg-amber-50 border-amber-100 text-amber-600' },
  ];

  const stats = [
    { label: 'Benefícios Ativos', value: '12', icon: Gift, color: 'text-rose-600 bg-rose-50 border-rose-100' },
    { label: 'Convênios', value: '45+', icon: Award, color: 'text-amber-600 bg-amber-50 border-amber-100' },
    { label: 'Cursos Oferecidos', value: '28', icon: GraduationCap, color: 'text-purple-600 bg-purple-50 border-purple-100' },
    { label: 'Servidores', value: '850+', icon: Users, color: 'text-blue-600 bg-blue-50 border-blue-100' },
  ];

  const programs = [
    { icon: Briefcase, title: 'Desenvolvimento Profissional', desc: 'Trilhas de carreira e capacitação contínua', color: 'bg-blue-50 border-blue-200', iconColor: 'text-blue-600 bg-blue-100', btn: 'Explorar programas' },
    { icon: Heart,     title: 'Qualidade de Vida',           desc: 'Ginástica laboral, psicológico e nutricional', color: 'bg-green-50 border-green-200', iconColor: 'text-green-600 bg-green-100', btn: 'Participar' },
    { icon: TrendingUp,title: 'Progressão de Carreira',      desc: 'Plano de cargos e oportunidades internas', color: 'bg-purple-50 border-purple-200', iconColor: 'text-purple-600 bg-purple-100', btn: 'Ver detalhes' },
  ];

  const typeConfig: Record<string, { color: string; label: string; dot: string }> = {
    benefit:  { color: 'bg-green-50 border-green-100 text-green-700',   label: 'Benefício',   dot: 'bg-green-500' },
    vacancy:  { color: 'bg-blue-50 border-blue-100 text-blue-700',     label: 'Vaga',        dot: 'bg-blue-500' },
    training: { color: 'bg-purple-50 border-purple-100 text-purple-700', label: 'Treinamento', dot: 'bg-purple-500' },
    news:     { color: 'bg-amber-50 border-amber-100 text-amber-700',  label: 'Novidade',    dot: 'bg-amber-500' },
  };

  return (
    <div className="space-y-5">

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl bg-linear-to-br from-rose-600 via-pink-600 to-rose-800 text-white py-3 px-6 -mt-5">
        <div className="absolute inset-0 opacity-5" style={{backgroundImage:'radial-gradient(circle, #fff 1px, transparent 1px)',backgroundSize:'24px 24px'}} />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="size-8 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center">
              <Heart className="size-4" />
            </div>
            <span className="text-sm font-semibold opacity-90">Recursos Humanos</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2 tracking-tight">Cuidando de Quem Cuida</h1>
          <p className="text-rose-100/80 text-sm max-w-xl leading-relaxed">
            Benefícios, programas e oportunidades disponíveis para você e sua família
          </p>
        </div>
      </motion.div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ y: -3 }}
              className="glass-card p-5 flex flex-col items-center text-center gap-2"
            >
              <div className={`size-11 rounded-xl border flex items-center justify-center ${stat.color}`}>
                <Icon className="size-5" />
              </div>
              <div className="text-3xl font-black text-foreground">{stat.value}</div>
              <div className="text-xs text-muted-foreground font-medium">{stat.label}</div>
            </motion.div>
          );
        })}
      </div>

      {/* Ações rápidas: Progressão + Banco de Horas + Acessar Sistema */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Progressão Funcional — card compacto */}
        <motion.button
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          onClick={abrirProgressao}
          className="
            glass-card px-4 py-3 flex items-center gap-3
            cursor-pointer
            shadow-md
            hover:bg-purple-50/40
            hover:shadow-lg
            transition-all duration-300
            group
            rounded-xl
            text-left
            sm:w-64 shrink-0
          "
        >
          <div className="size-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center shrink-0 transition-colors group-hover:bg-purple-200">
            <TrendingUp className="size-5 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Dados da Carreira Funcional</p>
            <p className="text-[11px] text-purple-600 font-medium">Ver minha carreira</p>
          </div>
          <ArrowRight className="size-4 text-purple-500 transition-transform duration-300 group-hover:translate-x-1 shrink-0" />
        </motion.button>

        {/* Desenvolvimento Profissional — card compacto */}
        <motion.button
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          onClick={abrirDesenvolvimento}
          className="
            glass-card px-4 py-3 flex items-center gap-3
            cursor-pointer
            shadow-md
            hover:bg-teal-50/40
            hover:shadow-lg
            transition-all duration-300
            group
            rounded-xl
            text-left
            sm:w-64 shrink-0
          "
        >
          <div className="size-9 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center shrink-0 transition-colors group-hover:bg-teal-200">
            <BookOpen className="size-5 text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Desenvolvimento Profissional</p>
            <p className="text-[11px] text-teal-600 font-medium">Cursos e capacitações</p>
          </div>
          <ArrowRight className="size-4 text-teal-500 transition-transform duration-300 group-hover:translate-x-1 shrink-0" />
        </motion.button>

        {/* Banco de Horas — card compacto */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => setModalAberto(true)}
          className="
            glass-card px-4 py-3 flex items-center gap-3
            cursor-pointer
            shadow-md
            hover:bg-rose-50/40
            hover:shadow-lg
            transition-all duration-300
            group
            rounded-xl
            sm:w-64 shrink-0
          "
        >
          <div className="size-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0 transition-colors group-hover:bg-rose-200">
            <Clock className="size-5 text-rose-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Banco de Horas</p>
            <p className="text-[11px] text-rose-600 font-medium">Ver meu saldo</p>
          </div>
          <ArrowRight className="size-4 text-rose-500 transition-transform duration-300 group-hover:translate-x-1 shrink-0" />
        </motion.div>

        <Button className="bg-primary hover:bg-primary/90 shrink-0 ml-auto" onClick={() => setSeletorAberto(true)}>
          Acessar Sistema de Gestão do RH
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>

      {/* Mini modal seletor de sistema */}
      <AnimatePresence>
        {seletorAberto && (
          <motion.div
            key="seletor-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setSeletorAberto(false); }}
          >
            <motion.div
              key="seletor-modal"
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-background rounded-2xl border border-border shadow-2xl w-full max-w-md"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <p className="font-bold text-sm">Acessar Sistema</p>
                  <p className="text-xs text-muted-foreground">Selecione o módulo desejado</p>
                </div>
                <button
                  onClick={() => setSeletorAberto(false)}
                  className="size-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Opções */}
              <div className="p-4 flex flex-col gap-3">
                {/* Opção 1: Banco de Horas */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setSeletorAberto(false); router.navigate('/rh/banco-de-horas'); }}
                  className="w-full text-left flex items-center gap-4 p-4 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 group"
                >
                  <div className="size-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                    <Clock className="size-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground">Gerenciar Banco de Horas</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Cards, gráficos e tabelas de banco de horas dos servidores
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-primary opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </motion.button>

                {/* Opção 2: Recursos Humanos */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { setSeletorAberto(false); router.navigate('/rh/gerenciar'); }}
                  className="w-full text-left flex items-center gap-4 p-4 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-50 hover:border-rose-300 transition-all duration-200 group"
                >
                  <div className="size-12 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0 group-hover:bg-rose-200 transition-colors">
                    <Settings2 className="size-6 text-rose-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground">Gerenciar Recursos Humanos</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                      Painel interno do IPAJM — colaboradores, estágios e afastamentos
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-rose-500 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Modal Progressão Funcional */}
      <AnimatePresence>
        {progressaoAberta && (
          <motion.div
            key="prog-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setProgressaoAberta(false); }}
          >
            <motion.div
              key="prog-modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22 }}
              className="bg-background rounded-3xl border border-border shadow-2xl w-full max-w-lg"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
                <div className="size-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center">
                  <TrendingUp className="size-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">Dados da Carreira Funcional</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.fullName ?? currentUser?.username}</p>
                </div>
                <button
                  onClick={() => setProgressaoAberta(false)}
                  className="size-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                {progressaoLoading && (
                  <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
                    <Loader2 className="size-8 animate-spin text-purple-500" />
                    <p className="text-sm">Consultando SIARHES…</p>
                  </div>
                )}

                {progressaoErro && !progressaoLoading && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                    <AlertCircle className="size-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Não foi possível carregar os dados</p>
                      <p className="text-xs mt-0.5 opacity-80">{progressaoErro}</p>
                    </div>
                  </div>
                )}

                {progressaoData && !progressaoLoading && (() => {
                  const d = progressaoData;
                  const situacaoAtiva = d.situacao?.toUpperCase() === 'ATIVO';

                  // Helper: só renderiza linha se valor não for vazio
                  const Row = ({ label, value }: { label: string; value?: string | number | null }) =>
                    value ? (
                      <div className="flex justify-between gap-3 text-sm py-1.5 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground shrink-0">{label}</span>
                        <span className="font-medium text-right">{String(value)}</span>
                      </div>
                    ) : null;

                  const DateRow = ({ label, iso }: { label: string; iso?: string | null }) =>
                    iso ? (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="size-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                          <Calendar className="size-3.5 text-slate-500" />
                        </div>
                        <span className="text-muted-foreground">{label}:</span>
                        <span className="font-medium">{fmtDataBR(iso)}</span>
                      </div>
                    ) : null;

                  return (
                    <div className="space-y-4">
                      {/* 1. Cargo + Situação */}
                      <div className="p-4 rounded-xl bg-muted/40 border border-border flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Cargo / Função</p>
                          <p className="font-bold text-base">{d.funcao || d.categoria || d.tipo_vinculo || '—'}</p>
                          {d.categoria && d.categoria !== d.funcao && (
                            <p className="text-xs text-muted-foreground mt-0.5">{d.categoria}</p>
                          )}
                        </div>
                        {d.situacao && (
                          <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            situacaoAtiva
                              ? 'bg-green-50 border-green-200 text-green-700'
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}>
                            {d.situacao}
                          </span>
                        )}
                      </div>

                      {/* 2. Vínculo — 2×2 grid */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Vínculo</p>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Tipo de Vínculo',   value: d.tipo_vinculo,          color: 'purple' },
                            { label: 'Regime Jurídico',   value: d.regime_juridico,        color: 'blue' },
                            { label: 'Previdência',       value: d.regime_previdenciario,  color: 'indigo' },
                            { label: 'Ônus',              value: d.tipo_de_onus,           color: 'amber' },
                          ].filter(i => i.value).map(({ label, value, color }) => (
                            <div key={label} className={`p-3 rounded-xl bg-${color}-50 border border-${color}-200 text-center`}>
                              <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                              <p className={`font-bold text-xs text-${color}-700`}>{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* 3. Lotação */}
                      {(d.orgao || d.tipo_de_requis || d.tipo_de_orgao || d.tipo_de_ressarcimento || d.empresa) && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Lotação</p>
                          <div className="rounded-xl border border-border bg-muted/20 px-3 py-1">
                            <Row label="Empresa / Secretaria" value={d.empresa && d.secretaria && d.empresa !== d.secretaria ? `${d.empresa} / ${d.secretaria}` : (d.empresa || d.secretaria)} />
                            <Row label="Órgão de Origem"      value={d.orgao} />
                            <Row label="Tipo de Órgão"        value={d.tipo_de_orgao} />
                            <Row label="Tipo de Requisição"   value={d.tipo_de_requis} />
                            <Row label="Ressarcimento"        value={d.tipo_de_ressarcimento} />
                          </div>
                        </div>
                      )}

                      {/* 4. Datas */}
                      {(d.data_exerc_org_origem || d.data_nomeacao || d.data_posse || d.data_exercicio || d.data_inicio_contrato || d.data_termino_contrato || d.dt_concurso) && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Datas do Vínculo</p>
                          <div className="space-y-2">
                            <DateRow label="Exercício no Órgão de Origem" iso={d.data_exerc_org_origem} />
                            <DateRow label="Nomeação"                     iso={d.data_nomeacao} />
                            <DateRow label="Posse"                        iso={d.data_posse} />
                            <DateRow label="Exercício"                    iso={d.data_exercicio} />
                            <DateRow label="Início do Contrato"           iso={d.data_inicio_contrato} />
                            <DateRow label="Término do Contrato"          iso={d.data_termino_contrato} />
                            <DateRow label="Prorrogação do Contrato"      iso={d.data_prorrogacao} />
                            <DateRow label="Data do Concurso"             iso={d.dt_concurso} />
                          </div>
                        </div>
                      )}

                      {/* 5. Matrícula / nº funcional */}
                      {(d.matricula_esocial || d.numfunc) && (
                        <div className="rounded-xl border border-border bg-muted/20 px-3 py-1">
                          <Row label="Número Funcional" value={d.numfunc} />
                          <Row label="Matrícula eSocial" value={d.matricula_esocial} />
                        </div>
                      )}

                      <p className="text-[11px] text-muted-foreground text-center">Dados via SIARHES</p>
                    </div>
                  );
                })()}

                {!progressaoLoading && !progressaoErro && progressaoData?.vinculo_ativo === null && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                    <AlertCircle className="size-5 shrink-0 mt-0.5" />
                    <p className="text-sm">{progressaoData.mensagem ?? 'Nenhum vínculo ativo encontrado.'}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Desenvolvimento Profissional */}
      <AnimatePresence>
        {devAberto && (
          <motion.div
            key="dev-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setDevAberto(false); }}
          >
            <motion.div
              key="dev-modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22 }}
              className="bg-background rounded-3xl border border-border shadow-2xl w-full max-w-2xl"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border">
                <div className="size-9 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center shrink-0">
                  <BookOpen className="size-4 text-teal-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">Desenvolvimento Profissional</p>
                  <p className="text-xs text-muted-foreground">{currentUser?.fullName ?? currentUser?.username}</p>
                </div>
                <button
                  onClick={() => setDevAberto(false)}
                  className="size-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Conteúdo */}
              <div className="p-6 max-h-[72vh] overflow-y-auto">
                {devLoading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                    <Loader2 className="size-8 animate-spin text-teal-500" />
                    <p className="text-sm">Consultando SIARHES…</p>
                  </div>
                )}

                {devErro && !devLoading && (
                  <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800">
                    <AlertCircle className="size-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Não foi possível carregar os dados</p>
                      <p className="text-xs mt-0.5 opacity-80">{devErro}</p>
                    </div>
                  </div>
                )}

                {devData && !devLoading && (() => {
                  if (devData.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                        <GraduationCapIcon className="size-12 text-muted-foreground/30" />
                        <p className="text-sm font-medium">Nenhum registro encontrado</p>
                        <p className="text-xs">Não há capacitações registradas no SIARHES para este servidor.</p>
                      </div>
                    );
                  }

                  // Agrupa por ano para exibição em linha do tempo
                  const porAno = devData.reduce<Record<string, CapacitacaoItem[]>>((acc, c) => {
                    const ano = c.data_inicio?.slice(0, 4) ?? 'Sem data';
                    (acc[ano] ??= []).push(c);
                    return acc;
                  }, {});
                  const anos = Object.keys(porAno).sort((a, b) => b.localeCompare(a));

                  // Totais
                  const totalHoras = devData.reduce((s, c) => s + (c.carga_horaria ?? 0), 0);
                  const totalCursos = devData.length;

                  return (
                    <div className="space-y-5">
                      {/* Banner de totais */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center shrink-0">
                            <Sparkles className="size-5 text-teal-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-black text-teal-700">{totalCursos}</p>
                            <p className="text-xs text-muted-foreground">Cursos / capacitações</p>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center gap-3">
                          <div className="size-10 rounded-xl bg-indigo-100 border border-indigo-200 flex items-center justify-center shrink-0">
                            <Clock3 className="size-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="text-2xl font-black text-indigo-700">{totalHoras}h</p>
                            <p className="text-xs text-muted-foreground">Carga horária total</p>
                          </div>
                        </div>
                      </div>

                      {/* Linha do tempo por ano */}
                      {anos.map(ano => (
                        <div key={ano}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{ano}</span>
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-[10px] text-muted-foreground">{porAno[ano].length} registro{porAno[ano].length !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="space-y-2">
                            {porAno[ano].map((c, idx) => (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.03 }}
                                className="flex gap-3 p-3 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors"
                              >
                                {/* Ícone entidade */}
                                <div className="size-9 rounded-lg bg-background border border-border flex items-center justify-center shrink-0">
                                  <Building2 className="size-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm leading-tight line-clamp-2">{c.nome_evento}</p>
                                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                                    {c.entidade && (
                                      <span className="text-[11px] text-muted-foreground">{c.entidade}</span>
                                    )}
                                    {c.data_inicio && (
                                      <span className="text-[11px] text-muted-foreground">
                                        {fmtDataBR(c.data_inicio)}{c.data_fim && c.data_fim !== c.data_inicio ? ` → ${fmtDataBR(c.data_fim)}` : ''}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {/* Badge carga horária */}
                                {(c.carga_horaria ?? 0) > 0 && (
                                  <span className="shrink-0 self-start text-[11px] font-bold bg-teal-50 border border-teal-200 text-teal-700 px-2 py-0.5 rounded-full">
                                    {c.carga_horaria}h
                                  </span>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <p className="text-[11px] text-muted-foreground text-center">Dados via SIARHES · Capacitações registradas oficialmente</p>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Banco de Horas */}
      <AnimatePresence>
        {modalAberto && (
          <motion.div
            key="bh-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setModalAberto(false); }}
          >
            <motion.div
              key="bh-modal"
              initial={{ opacity: 0, scale: 0.96, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22 }}
              className="bg-background rounded-3xl border border-border shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col"
            >
              {/* Header do modal */}
              <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
                <div className="size-9 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center">
                  <Clock className="size-4 text-rose-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">Banco de Horas</p>
                  <p className="text-xs text-muted-foreground">Dados do servidor — {currentUser?.fullName ?? currentUser?.username}</p>
                </div>
                <button
                  onClick={() => setModalAberto(false)}
                  className="size-8 rounded-xl flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="size-4" />
                </button>
              </div>
              {/* Conteúdo com scroll */}
              <div className="overflow-y-auto p-6 flex-1">
                {currentUser && (
                  <BancoDeHoras fullName={currentUser.fullName} />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Highlights */}
      <div>
        <h2 className="text-xl font-bold mb-5">Destaques e Novidades</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockHRHighlights.map((highlight, i) => {
            const cfg = typeConfig[highlight.type] || typeConfig.news;
            return (
              <motion.div
                key={highlight.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -2 }}
                className="glass-card p-5 flex flex-col gap-3 group"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.color}`}>
                    <span className={`size-1.5 rounded-full ${cfg.dot}`} />
                    {cfg.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDate(highlight.date)}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground mb-1 group-hover:text-rose-700 transition-colors">{highlight.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{highlight.description}</p>
                </div>
                {highlight.link && (
                  <Button variant="outline" size="sm" className="rounded-xl mt-auto w-full gap-1.5 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700">
                    Saiba mais <ArrowRight className="size-3.5" />
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Benefits */}
      <div>
        <h2 className="text-xl font-bold mb-5">Principais Benefícios</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {benefits.map((benefit, i) => {
            const Icon = benefit.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -12 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`flex items-center gap-4 p-5 rounded-2xl border ${benefit.color.replace('text-', 'border-').split(' ')[1]} bg-white/70 backdrop-blur`}
              >
                <div className={`size-12 rounded-xl border flex items-center justify-center shrink-0 ${benefit.color}`}>
                  <Icon className="size-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{benefit.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{benefit.description}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Programs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {programs.map((prog, i) => {
          const Icon = prog.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.07 }}
              className={`p-6 rounded-2xl border ${prog.color} flex flex-col gap-4`}
            >
              <div className={`size-12 rounded-xl flex items-center justify-center ${prog.iconColor}`}>
                <Icon className="size-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-foreground">{prog.title}</h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{prog.desc}</p>
              </div>
              <Button variant="outline" className="mt-auto rounded-xl w-full">{prog.btn}</Button>
            </motion.div>
          );
        })}
      </div>

      {/* Contact card */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <div className="size-10 rounded-xl bg-rose-100 border border-rose-200 flex items-center justify-center">
            <Heart className="size-5 text-rose-600" />
          </div>
          <div>
            <h3 className="font-bold text-base">Entre em Contato com o RH</h3>
            <p className="text-xs text-muted-foreground">Nossa equipe está à sua disposição</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: Mail, label: 'E-mail', value: 'rh@ipajm.es.gov.br' },
            { icon: Phone, label: 'Telefone', value: '(27) 3636-4247 - Ramal 200' },
            { icon: Clock, label: 'Horário', value: 'Seg a Sex, 8h às 18h' },
            { icon: MapPin, label: 'Local', value: '2º andar — RH' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-rose-50/60 border border-rose-100/60">
              <Icon className="size-4 text-rose-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400">{label}</p>
                <p className="text-xs text-foreground font-medium">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
