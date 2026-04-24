import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Clock, 
  Users, 
  ClipboardList, 
  TrendingUp,
  CalendarClock,
  Download,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter } from '@/components/ui/dialog';
import { DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createRegistroHoras, fetchGerencialDashboard, fetchServidores, type GerencialDashboard, type ServidorSugestao } from '@/services/timeManagementService';
import { exportRelatorioGerencialPDF } from '@/services/pdfExportService';

const initialDashboard: GerencialDashboard = {
  summary: {
    total_servidores: 0,
    registros_horas: 0,
    horas_trabalhadas_hhmm: '00:00',
    horas_direito_hhmm: '00:00',
    horas_gozadas_hhmm: '00:00',
    saldo_total_hhmm: '00:00',
  },
  horas_por_mes: [],
  saldo_por_setor: [],
  top_servidores: [],
};

function hhmmToDisplay(value: string): string {
  return `${value}h`;
}

function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function timeToMinutes(value: string): number {
  if (!value || !value.includes(':')) return 0;
  const [h, m] = value.split(':').map(Number);
  return (h * 60) + m;
}

function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function calcPrazoLabel(diaTrabalhado: string): string {
  if (!diaTrabalhado) return '-';
  const date = new Date(`${diaTrabalhado}T00:00:00`);
  date.setMonth(date.getMonth() + 6);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function TimeManagementPage() {
  const [filterTodos, setFilterTodos] = useState('todos');
  const [filterSetor, setFilterSetor] = useState('todos');
  const [filterServidor, setFilterServidor] = useState('todos');
  const [dateFrom, setDateFrom] = useState('2025-07-01');
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [modalAberto, setModalAberto] = useState(false);
  const [dashboard, setDashboard] = useState<GerencialDashboard>(initialDashboard);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registroUsername, setRegistroUsername] = useState('');
  const [registroNome, setRegistroNome] = useState('');
  const [registroSetor, setRegistroSetor] = useState('');
  const [registroDia, setRegistroDia] = useState('');
  const [registroEntrada, setRegistroEntrada] = useState('');
  const [registroSaida, setRegistroSaida] = useState('');
  const [registroObservacao, setRegistroObservacao] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sugestoes, setSugestoes] = useState<ServidorSugestao[]>([]);
  const [showSugestoes, setShowSugestoes] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  // Records view
  const [verRegistrosAberto, setVerRegistrosAberto] = useState(false);
  const [registros, setRegistros] = useState<any[]>([]);
  const [loadingRegistros, setLoadingRegistros] = useState(false);
  const [erroRegistros, setErroRegistros] = useState<string | null>(null);
  const [registroFiltroNome, setRegistroFiltroNome] = useState('');
  const [registroFiltroSetor, setRegistroFiltroSetor] = useState('');
  const [editandoRegistro, setEditandoRegistro] = useState<any | null>(null);
  const [editEntrada, setEditEntrada] = useState('');
  const [editSaida, setEditSaida] = useState('');
  const [editHorasDesc, setEditHorasDesc] = useState('');
  const [editDiasGozados, setEditDiasGozados] = useState('');
  const [editObservacao, setEditObservacao] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletandoId, setDeletandoId] = useState<number | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchGerencialDashboard({
        dateFrom,
        dateTo,
        setor: filterSetor,
        username: filterServidor,
      });
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar os dados gerenciais.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  // Auto-refresh a cada 60 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      loadDashboard();
    }, 60_000);
    return () => clearInterval(interval);
  }, [dateFrom, dateTo, filterSetor, filterServidor]);

  const handleUsernameInput = async (value: string) => {
    setRegistroUsername(value);
    if (value.trim().length >= 2) {
      const results = await fetchServidores(value);
      setSugestoes(results);
      setShowSugestoes(results.length > 0);
    } else {
      setSugestoes([]);
      setShowSugestoes(false);
    }
  };

  const minutosTrabalhados = (() => {
    if (!registroEntrada || !registroSaida) return 0;
    const entrada = timeToMinutes(registroEntrada);
    let saida = timeToMinutes(registroSaida);
    if (saida < entrada) saida += 24 * 60;
    return Math.max(saida - entrada, 0);
  })();

  const minutosDireito = minutosTrabalhados * 2;

  const handleSalvarRegistro = async () => {
    if (!registroUsername || !registroDia || !registroEntrada || !registroSaida) {
      setSaveError('Preencha servidor, data, entrada e saida para salvar.');
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await createRegistroHoras({
        username: registroUsername.trim(),
        nome: registroNome || undefined,
        setor: registroSetor || undefined,
        dia_trabalhado: registroDia,
        entrada: registroEntrada,
        saida: registroSaida,
        observacao: registroObservacao || undefined,
      });

      setModalAberto(false);
      setRegistroUsername('');
      setRegistroNome('');
      setRegistroSetor('');
      setRegistroDia('');
      setRegistroEntrada('');
      setRegistroSaida('');
      setRegistroObservacao('');

      await loadDashboard();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erro ao salvar registro.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Registros CRUD ──────────────────────────────────────────────────────
  const loadRegistros = async () => {
    setLoadingRegistros(true);
    setErroRegistros(null);
    try {
      const resp = await fetch('https://srh.pythonanywhere.com/api/dias-trabalhados');
      if (!resp.ok) throw new Error('Falha ao carregar registros');
      const data = await resp.json();
      setRegistros(
        data.sort((a: any, b: any) =>
          (b.dia_trabalhado ?? '').localeCompare(a.dia_trabalhado ?? '')
        )
      );
    } catch (e) {
      setErroRegistros(e instanceof Error ? e.message : 'Erro ao carregar registros');
    } finally {
      setLoadingRegistros(false);
    }
  };

  useEffect(() => {
    if (verRegistrosAberto) loadRegistros();
  }, [verRegistrosAberto]);

  const abrirEdicao = (r: any) => {
    setEditandoRegistro(r);
    setEditEntrada(r.entrada ?? '');
    setEditSaida(r.saida ?? '');
    setEditHorasDesc(r.horas_descontadas ?? '');
    setEditDiasGozados(r.dias_gozados ?? '');
    setEditObservacao(r.observacao ?? '');
    setEditError(null);
  };

  const handleSalvarEdicao = async () => {
    if (!editandoRegistro) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const body = {
        entrada: editEntrada,
        saida: editSaida,
        horas_descontadas: editHorasDesc || null,
        dias_gozados: editDiasGozados || null,
        observacao: editObservacao || null,
      };
      const resp = await fetch(
        `https://srh.pythonanywhere.com/api/dias-trabalhados/${editandoRegistro.id}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        throw new Error(err?.detail ?? err?.error ?? 'Falha ao salvar edição');
      }
      setEditandoRegistro(null);
      await loadRegistros();
      await loadDashboard();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletar = async (id: number) => {
    setDeletandoId(id);
    try {
      const resp = await fetch(
        `https://srh.pythonanywhere.com/api/dias-trabalhados/${id}`,
        { method: 'DELETE' }
      );
      if (!resp.ok) throw new Error('Falha ao excluir');
      setRegistros(prev => prev.filter((r: any) => r.id !== id));
      await loadDashboard();
    } catch {
      // silent — record stays in list if delete failed
    } finally {
      setDeletandoId(null);
      setConfirmDeleteId(null);
    }
  };

  const stats = [
    { 
      label: 'Total de Servidores', 
      value: String(dashboard.summary.total_servidores), 
      icon: Users,
      description: 'Servidores ativos',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      label: 'Registros de Horas', 
      value: String(dashboard.summary.registros_horas), 
      icon: ClipboardList,
      description: 'Lançamentos no mês',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    { 
      label: 'Horas Trabalhadas', 
      value: hhmmToDisplay(dashboard.summary.horas_trabalhadas_hhmm), 
      icon: Clock,
      description: 'Total acumulado',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    { 
      label: 'Horas de Direito', 
      value: hhmmToDisplay(dashboard.summary.horas_direito_hhmm), 
      icon: CalendarClock,
      description: 'Horas disponíveis',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    { 
      label: 'Horas Gozadas', 
      value: hhmmToDisplay(dashboard.summary.horas_gozadas_hhmm), 
      icon: TrendingUp,
      description: 'Horas utilizadas',
      color: 'text-rose-600',
      bgColor: 'bg-rose-50'
    },
    { 
      label: 'Saldo Total', 
      value: hhmmToDisplay(dashboard.summary.saldo_total_hhmm), 
      icon: TrendingUp,
      description: 'Saldo disponível',
      color: 'text-primary',
      bgColor: 'bg-green-50'
    },
  ];

  const horasMonthlyData = dashboard.horas_por_mes;
  const saldoPorSetor = dashboard.saldo_por_setor;
  const topServidores = dashboard.top_servidores.map((item) => ({
    ...item,
    nome: toTitleCase(item.nome),
    saldo: hhmmToDisplay(item.saldo_hhmm),
  }));

  const setoresDisponiveis = dashboard.saldo_por_setor.map((item) => item.setor);

  const formatMonth = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${monthNames[parseInt(month) - 1]}/${year.slice(2)}`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg bg-linear-to-br from-green-700 to-green-900 text-white px-6 py-3 -mt-5.5">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="size-6" />
            <span className="text-sm font-medium opacity-90">
              Recursos Humanos
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            Central de Gerenciamento
          </h1>
          <p className="text-green-100 max-w-2xl">
            Gerenciamento de servidores - Subgerência de Recursos Humanos (SRH)
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`size-10 rounded-lg ${stat.bgColor} flex items-center justify-center shrink-0`}>
                    <Icon className={`size-5 ${stat.color}`} />
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Análises do Banco de Horas */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between space-y-0 pb-2">
          <CardTitle>Análises do Banco de Horas</CardTitle>
          <div className="flex flex-row gap-3 items-center">
            <Button
              className="bg-primary hover:bg-primary/90"
              disabled={exportingPDF}
              onClick={async () => {
                setExportingPDF(true);
                try {
                  await exportRelatorioGerencialPDF(dashboard, dateFrom, dateTo);
                } finally {
                  setExportingPDF(false);
                }
              }}
            >
              <Download className="size-4" />
              {exportingPDF ? 'Gerando PDF...' : 'Exportar Relatório Gerencial (PDF)'}
            </Button>
            <Button variant="outline" onClick={() => setVerRegistrosAberto(true)}>
              <Eye className="size-4" />
              Ver Registros
            </Button>
            <Button 
            className="bg-primary hover:bg-primary/90"
            onClick={() => setModalAberto(true)}>
              <Clock className="size-4" />
              Registrar horas trabalhadas
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filtros */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Filtro</label>
              <Select value={filterTodos} onValueChange={setFilterTodos}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendentes">Pendentes</SelectItem>
                  <SelectItem value="aprovados">Aprovados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Setor</label>
              <Select value={filterSetor} onValueChange={setFilterSetor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {setoresDisponiveis.map((setorNome) => (
                    <SelectItem key={setorNome} value={setorNome}>
                      {setorNome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <label className="text-sm text-muted-foreground">Servidor</label>
              <Select value={filterServidor} onValueChange={setFilterServidor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {dashboard.top_servidores.map((servidor) => (
                    <SelectItem key={servidor.id} value={servidor.id}>
                      {toTitleCase(servidor.nome)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">De</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Até</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={loadDashboard} disabled={loading}>
              <RefreshCw className="size-4 mr-2" />
              {loading ? 'Atualizando...' : 'Atualizar Análises'}
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {/* Horas por Mês */}
            <div className="space-y-4">
              <h3 className="font-semibold">Horas por Mês</h3>
              <div className="h-75">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={horasMonthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={formatMonth}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      labelFormatter={formatMonth}
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="liquidadas" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Horas liquidadas"
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="direito" 
                      stroke="#006600" 
                      strokeWidth={2}
                      name="Horas de Direito"
                      dot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="perdidas" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      name="Horas perdidas"
                      dot={{ r: 4 }}
                    />

                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Saldo por Setor */}
            <div className="space-y-4">
              <h3 className="font-semibold">Saldo por Setor</h3>
              <div className="h-75">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={saldoPorSetor} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis 
                      dataKey="setor" 
                      type="category" 
                      width={120}
                      tick={{ fontSize: 10 }}
                      interval={0}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                      formatter={(value) => [`${value}h`, 'Saldo']}
                    />
                    <Bar 
                      dataKey="saldo" 
                      fill="#006600" 
                      radius={[0, 4, 4, 0]}
                      name="Saldo"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Top 10 Servidores */}
          <div className="space-y-4 mt-8">
            <h3 className="font-semibold">Top 10 Servidores por Saldo</h3>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Pos</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topServidores.map((servidor, index) => (
                    <TableRow key={servidor.id}>
                      <TableCell className="font-medium">
                        {index + 1}º
                      </TableCell>
                      <TableCell>{servidor.nome}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {servidor.setor}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {servidor.saldo}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Registro de Horas */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="border-b pb-3">
            <DialogTitle>Novo Registro de Horas</DialogTitle>
            <DialogDescription>
              Preencha os dados do registro
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Servidor */}
            <div className="space-y-2">
              <Label>Servidor (username)</Label>
              <div className="relative">
                <Input
                  placeholder="Digite o username do servidor..."
                  value={registroUsername}
                  onChange={(e) => handleUsernameInput(e.target.value)}
                  onBlur={() => setTimeout(() => setShowSugestoes(false), 150)}
                  autoComplete="off"
                />
                {showSugestoes && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                    {sugestoes.map((s) => (
                      <button
                        key={s.username}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex justify-between"
                        onMouseDown={() => {
                          setRegistroUsername(s.username);
                          setRegistroNome(toTitleCase(s.nome ?? s.username));
                          setRegistroSetor(s.setor ?? '');
                          setShowSugestoes(false);
                        }}
                      >
                        <span className="font-medium">{toTitleCase(s.nome ?? s.username)}</span>
                        <span className="text-muted-foreground text-xs">{s.setor}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Data */}
            <div className="space-y-2">
              <Label>Dia Trabalhado</Label>
              <Input
                type="date"
                value={registroDia}
                onChange={(e) => setRegistroDia(e.target.value)}
              />
            </div>

            {/* Entrada / Saída */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Entrada</Label>
                <Input
                  type="time"
                  value={registroEntrada}
                  onChange={(e) => setRegistroEntrada(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Saída</Label>
                <Input
                  type="time"
                  value={registroSaida}
                  onChange={(e) => setRegistroSaida(e.target.value)}
                />
              </div>
            </div>

            {/* Campos auto */}
            <div className="grid grid-cols-2 gap-3">
              <Input disabled value={minutosTrabalhados > 0 ? minutesToHHMM(minutosTrabalhados) : ''} placeholder="Horas Trabalhadas" />
              <Input disabled value={minutosDireito > 0 ? minutesToHHMM(minutosDireito) : ''} placeholder="Horas Direito (2x)" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input disabled value={registroDia ? calcPrazoLabel(registroDia) : ''} placeholder="Prazo (6 meses)" />
              <Input disabled value="08:00" />
            </div>

            {/* Observação */}
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea
                rows={2}
                value={registroObservacao}
                onChange={(e) => setRegistroObservacao(e.target.value)}
              />
            </div>

            {saveError && <p className="text-sm text-red-600">{saveError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAberto(false)}>
              Cancelar
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={handleSalvarRegistro} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Registro'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Ver Registros */}
      <Dialog
        open={verRegistrosAberto}
        onOpenChange={(open) => {
          setVerRegistrosAberto(open);
          if (!open) { setEditandoRegistro(null); setConfirmDeleteId(null); }
        }}
      >
        <DialogContent
          className="!max-w-[98vw] !w-[98vw] max-h-[92vh] flex flex-col overflow-hidden p-4"
          style={{ maxWidth: '98vw', width: '98vw' }}
        >
          <DialogHeader className="border-b pb-4 flex-none">
            <DialogTitle>Registros de Servidores</DialogTitle>
            <DialogDescription>
              Todos os registros de banco de horas. Edite ou exclua conforme necessário.
            </DialogDescription>
          </DialogHeader>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 py-3 border-b flex-none items-center">
            <Input
              placeholder="Buscar por nome ou NF..."
              value={registroFiltroNome}
              onChange={(e) => setRegistroFiltroNome(e.target.value)}
              className="max-w-xs"
            />
            <Select
              value={registroFiltroSetor || 'todos'}
              onValueChange={(v) => setRegistroFiltroSetor(v === 'todos' ? '' : v)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os setores</SelectItem>
                {[...new Set(registros.map((r: any) => r.setor).filter(Boolean))].sort().map((s: any) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={loadRegistros} disabled={loadingRegistros}>
              <RefreshCw className={`size-4 mr-1 ${loadingRegistros ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <span className="ml-auto text-sm text-muted-foreground">
              {registros.filter((r: any) => {
                const q = registroFiltroNome.toLowerCase();
                return (!q || r.nome?.toLowerCase().includes(q) || r.nf?.includes(registroFiltroNome)) &&
                  (!registroFiltroSetor || r.setor === registroFiltroSetor);
              }).length} registro(s)
            </span>
          </div>

          {/* Tabela */}
          <div className="flex-1 overflow-auto min-h-0">
            {erroRegistros ? (
              <p className="text-sm text-red-600 p-4">{erroRegistros}</p>
            ) : loadingRegistros ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                Carregando registros...
              </div>
            ) : (
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[160px]">Nome</TableHead>
                    <TableHead className="min-w-[70px]">Setor</TableHead>
                    <TableHead className="min-w-[95px]">Dia</TableHead>
                    <TableHead className="min-w-[72px]">Entrada</TableHead>
                    <TableHead className="min-w-[65px]">Saída</TableHead>
                    <TableHead className="min-w-[78px]">H. Trab.</TableHead>
                    <TableHead className="min-w-[85px]">H. Direito</TableHead>
                    <TableHead className="min-w-[95px]">Prazo</TableHead>
                    <TableHead className="min-w-[130px]">Dias Gozados</TableHead>
                    <TableHead className="min-w-[78px]">H. Desc.</TableHead>
                    <TableHead className="min-w-[70px]">Saldo</TableHead>
                    <TableHead className="min-w-[95px] text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {registros
                    .filter((r: any) => {
                      const q = registroFiltroNome.toLowerCase();
                      return (
                        (!q || r.nome?.toLowerCase().includes(q) || r.nf?.includes(registroFiltroNome)) &&
                        (!registroFiltroSetor || r.setor === registroFiltroSetor)
                      );
                    })
                    .map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium text-sm leading-tight">{toTitleCase(r.nome ?? '')}</div>
                          <div className="text-xs text-muted-foreground">NF {r.nf}</div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {r.setor}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {r.dia_trabalhado
                            ? new Date(r.dia_trabalhado + 'T00:00:00').toLocaleDateString('pt-BR')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-sm">{r.entrada ?? '-'}</TableCell>
                        <TableCell className="text-sm">{r.saida ?? '-'}</TableCell>
                        <TableCell className="text-sm">{r.h_trabalhada ?? '-'}</TableCell>
                        <TableCell className="text-sm">{r.h_direito ?? '-'}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {r.prazo_max
                            ? new Date(r.prazo_max + 'T00:00:00').toLocaleDateString('pt-BR')
                            : '-'}
                        </TableCell>
                        <TableCell className="text-xs max-w-[130px]">
                          <div className="line-clamp-2">{r.dias_gozados || '-'}</div>
                        </TableCell>
                        <TableCell className="text-sm">{r.horas_descontadas || '-'}</TableCell>
                        <TableCell className="text-sm font-medium">{r.saldo || '-'}</TableCell>
                        <TableCell>
                          {confirmDeleteId === r.id ? (
                            <div className="flex gap-1 items-center justify-center">
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-6 px-2 text-xs"
                                disabled={deletandoId === r.id}
                                onClick={() => handleDeletar(r.id)}
                              >
                                {deletandoId === r.id ? '...' : 'Sim'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-2 text-xs"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                Não
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1 items-center justify-center">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => abrirEdicao(r)}
                              >
                                <Pencil className="size-3.5 text-blue-600" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() => setConfirmDeleteId(r.id)}
                              >
                                <Trash2 className="size-3.5 text-red-500" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Edição de Registro */}
      <Dialog open={!!editandoRegistro} onOpenChange={(open) => { if (!open) setEditandoRegistro(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader className="border-b pb-3">
            <DialogTitle>Editar Registro</DialogTitle>
            <DialogDescription>
              {toTitleCase(editandoRegistro?.nome ?? '')} —{' '}
              {editandoRegistro?.dia_trabalhado
                ? new Date(editandoRegistro.dia_trabalhado + 'T00:00:00').toLocaleDateString('pt-BR')
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Entrada</Label>
                <Input type="time" value={editEntrada} onChange={(e) => setEditEntrada(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Saída</Label>
                <Input type="time" value={editSaida} onChange={(e) => setEditSaida(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Horas Descontadas</Label>
                <Input
                  placeholder="HH:MM"
                  value={editHorasDesc}
                  onChange={(e) => setEditHorasDesc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Dias Gozados</Label>
                <Input
                  placeholder="ex: 10/03/2026"
                  value={editDiasGozados}
                  onChange={(e) => setEditDiasGozados(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Textarea rows={2} value={editObservacao} onChange={(e) => setEditObservacao(e.target.value)} />
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditandoRegistro(null)}>
              Cancelar
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleSalvarEdicao}
              disabled={savingEdit}
            >
              {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Informações Adicionais */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Informações sobre o Banco de Horas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <strong>Regras:</strong> O banco de horas segue as diretrizes da Lei nº 8.112/90 e regulamentações internas do IPAJM-ES.
          </p>
          <p className="text-sm">
            <strong>Compensação:</strong> As horas excedentes podem ser compensadas em até 12 meses após o lançamento.
          </p>
          <p className="text-sm">
            <strong>Aprovação:</strong> Todos os lançamentos devem ser aprovados pelo gestor imediato.
          </p>
          <p className="text-sm">
            <strong>Dúvidas:</strong> Entre em contato com o RH através do ramal 200 ou email rh@ipajm.es.gov.br
          </p>
        </CardContent>
      </Card>
    </div>
  );
}