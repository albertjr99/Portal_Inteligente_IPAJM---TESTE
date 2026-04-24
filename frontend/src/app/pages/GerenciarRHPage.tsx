import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Users,
  ClipboardList,
  FileText,
  UserX,
  GraduationCap,
  CalendarClock,
  Settings2,
  Construction,
  RefreshCw,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatCardClickable } from '@/components/StatCardClickable';
import { fetchSiarhesResumo, type SiarhesResumo } from '@/services/siarhesService';

const proximosPaineis = [
  { title: 'Gestão de Frequências',    desc: 'Controle de presença, faltas e justificativas dos servidores.' },
  { title: 'Contratos de Estágio',     desc: 'Acompanhamento de contratos, renovações e encerramentos.' },
  { title: 'Afastamentos e Licenças',  desc: 'Férias, licenças médicas, maternidade/paternidade e recesso.' },
  { title: 'Quadro de Estagiários',    desc: 'Cadastro, alocação e avaliação de estagiários por setor.' },
  { title: 'Relatórios de RH',         desc: 'Exportação de dados gerenciais de recursos humanos.' },
  { title: 'Configurações do Sistema', desc: 'Parâmetros, permissões e integrações do módulo RH.' },
];

export function GerenciarRHPage() {
  const [resumo, setResumo] = useState<SiarhesResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSiarhesResumo();
      setResumo(data);
      setLastUpdated(new Date());
    } catch (e) {
      setError('Backend indisponível — inicie o servidor para carregar dados reais do SIARHES.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const fmt = (v: number | null | undefined) =>
    v !== null && v !== undefined ? String(v) : null;

  // Conteúdo de detalhes para cada card
  const getFrequenciasDetails = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-xs text-muted-foreground">Total de Ativos</p>
          <p className="text-2xl font-bold text-blue-600">{resumo?.frequencias_detalhes?.total_ativos || 0}</p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <p className="text-xs text-muted-foreground">Com Frequência</p>
          <p className="text-2xl font-bold text-emerald-600">{resumo?.frequencias_detalhes?.total_com_frequencia || 0}</p>
        </div>
      </div>
      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
        <p className="text-xs text-muted-foreground">Mês de Referência</p>
        <p className="text-sm font-medium">
          {resumo?.frequencias_detalhes?.mes_referencia}/{resumo?.frequencias_detalhes?.ano_referencia}
        </p>
      </div>
      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
        <p className="text-xs text-muted-foreground">Sem Frequência</p>
        <p className="text-2xl font-bold text-rose-600">{resumo?.frequencias_pendentes || 0}</p>
      </div>
      <p className="text-xs text-muted-foreground italic">
        Frequência refere-se ao mês anterior (março). Os servidores listados acima não registraram presença no sistema.
      </p>
    </div>
  );

  const getColaboradoresDetails = () => (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
        <p className="text-xs text-muted-foreground">Total de Colaboradores Ativos</p>
        <p className="text-2xl font-bold text-blue-600">{resumo?.total_colaboradores || 0}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
          <p className="text-xs text-muted-foreground">Estagiários</p>
          <p className="text-xl font-bold text-purple-600">{resumo?.estagiarios || 0}</p>
        </div>
        <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
          <p className="text-xs text-muted-foreground">Comissionados</p>
          <p className="text-xl font-bold text-indigo-600">{resumo?.comissionados || 0}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground italic">
        Inclui todos os vínculos ativos (efetivos, comissionados e estagiários).
      </p>
    </div>
  );

  const getAfastadosDetails = () => (
    <div className="space-y-3">
      <div className="p-3 rounded-lg bg-rose-50 border border-rose-200">
        <p className="text-xs text-muted-foreground">Total de Afastados</p>
        <p className="text-2xl font-bold text-rose-600">{resumo?.afastados || 0}</p>
      </div>
      {resumo?.afastados_por_tipo && Object.keys(resumo.afastados_por_tipo).length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Detalhamento por Tipo:</p>
          <div className="space-y-1">
            {Object.entries(resumo.afastados_por_tipo).map(([tipo, qtd]) => (
              <div key={tipo} className="flex justify-between items-center p-2 rounded bg-muted/50">
                <span className="text-sm">{tipo}</span>
                <span className="font-semibold text-rose-600">{qtd}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground italic">
        Inclui licenças médicas, maternidade/paternidade, afastamentos e outros.
      </p>
    </div>
  );

  const getFeriasDetails = () => (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 rounded-lg bg-cyan-50 border border-cyan-200">
          <p className="text-xs text-muted-foreground">Com Saldo</p>
          <p className="text-2xl font-bold text-cyan-600">{resumo?.ferias_com_saldo || 0}</p>
        </div>
        <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
          <p className="text-xs text-muted-foreground">A Vencer (6 meses)</p>
          <p className="text-2xl font-bold text-orange-600">{resumo?.ferias_a_vencer || 0}</p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground italic">
        Férias a vencer referem-se aos próximos 6 meses a partir de hoje.
      </p>
    </div>
  );

  const cards = [
    {
      label: 'Total de colaboradores',
      value: fmt(resumo?.total_colaboradores),
      description: 'Vínculos ativos',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      err: !!resumo?.errors?.vinculos,
      detailsTitle: 'Colaboradores Ativos',
      detailsContent: getColaboradoresDetails(),
    },
    {
      label: 'Frequências pendentes',
      value: fmt(resumo?.frequencias_pendentes),
      description: 'Sem frequência em março',
      icon: ClipboardList,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      err: !!resumo?.errors?.frequencias,
      detailsTitle: 'Análise de Frequências',
      detailsContent: getFrequenciasDetails(),
    },
    {
      label: 'Contratos de Estágio',
      value: fmt(resumo?.estagiarios),
      description: 'Estagiários ativos',
      icon: FileText,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      err: !!resumo?.errors?.vinculos,
    },
    {
      label: 'Colaboradores afastados',
      value: fmt(resumo?.afastados),
      description: 'Licenças ativas',
      icon: UserX,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      err: !!resumo?.errors?.afastados,
      detailsTitle: 'Colaboradores Afastados',
      detailsContent: getAfastadosDetails(),
    },
    {
      label: 'Total de estagiários',
      value: fmt(resumo?.estagiarios),
      description: 'Ativos',
      icon: GraduationCap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      err: !!resumo?.errors?.vinculos,
    },
    {
      label: 'Férias previstas',
      value: fmt(resumo?.ferias_a_vencer),
      description: 'Próximos 6 meses',
      icon: CalendarClock,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      err: !!resumo?.errors?.ferias,
      detailsTitle: 'Situação de Férias',
      detailsContent: getFeriasDetails(),
    },
  ];

  const backendOk = !error && resumo !== null;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="relative overflow-hidden rounded-lg bg-linear-to-br from-rose-700 to-rose-900 text-white px-6 py-3 -mt-5.5">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Settings2 className="size-6" />
            <span className="text-sm font-medium opacity-90">Recursos Humanos</span>
          </div>
          <h1 className="text-3xl font-bold mb-2">Gerenciar Recursos Humanos</h1>
          <p className="text-rose-100 max-w-2xl">
            Painel interno do IPAJM — integração SIARHES · Subgerência de Recursos Humanos
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Cards de resumo */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Visão Geral</span>

          {/* Status badge */}
          {loading ? (
            <span className="text-xs text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <RefreshCw className="size-3 animate-spin" /> Consultando SIARHES — pode levar até 60s...
            </span>
          ) : backendOk ? (
            <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Wifi className="size-3" /> SIARHES conectado
            </span>
          ) : (
            <span className="text-xs text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
              <WifiOff className="size-3" /> Backend offline — dados indisponíveis
            </span>
          )}

          {lastUpdated && (
            <span className="text-xs text-muted-foreground ml-auto">
              Atualizado às {lastUpdated.toLocaleTimeString('pt-BR')}
            </span>
          )}
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={load} disabled={loading}>
            <RefreshCw className={`size-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        {/* Erro de backend */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Erros parciais por endpoint */}
        {!error && resumo && Object.values(resumo.errors).some(Boolean) && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
            <AlertCircle className="size-4 mt-0.5 shrink-0" />
            <span>
              Alguns dados não puderam ser carregados do SIARHES.
              Os cards afetados exibem "N/D".
              {Object.entries(resumo.errors)
                .filter(([, v]) => v)
                .map(([k, v]) => ` [${k}: ${v}]`)
                .join('')}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {cards.map((card, i) => (
            <StatCardClickable
              key={i}
              label={card.label}
              value={card.value}
              description={card.description}
              icon={card.icon}
              color={card.color}
              bgColor={card.bgColor}
              loading={loading}
              error={card.err}
              detailsTitle={card.detailsTitle}
              detailsContent={card.detailsContent}
            />
          ))}
        </div>
      </div>

      {/* Painéis em construção */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Construction className="size-5 text-amber-500" />
            Módulos em Desenvolvimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proximosPaineis.map((painel, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 p-4 rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-400 shrink-0" />
                  <p className="font-semibold text-sm">{painel.title}</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{painel.desc}</p>
                <span className="text-[11px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full self-start">
                  Em breve
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
