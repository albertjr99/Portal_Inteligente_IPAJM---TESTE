import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { BancoDeHoras } from '@/components/BancoDeHoras';
import { useAuth } from '@/contexts/AuthContext';
import { mockHRHighlights } from '@/data/mockData';
import { formatDate } from '@/utils/helpers';
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
} from 'lucide-react';

import { router } from '@/routes/routes';

export function HRPage() {
  const { currentUser } = useAuth();
  const [modalAberto, setModalAberto] = useState(false);
  const [seletorAberto, setSeletorAberto] = useState(false);
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

      {/* Banco de Horas — card compacto */}
      <div className="flex items-center gap-4 max-w-2xl mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={() => setModalAberto(true)}
          className="
            glass-card p-5 flex items-center gap-4
            max-w-2xl mx-auto w-full
            cursor-pointer
            shadow-md
            hover:bg-rose-50/40
            hover:shadow-lg
            transition-all duration-300
            group
            rounded-xl">
          <div className="size-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center shrink-0 transition-colors group-hover:bg-rose-200">
            <Clock className="size-6 text-rose-600" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">
              Banco de Horas
            </p>

            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Consulte seu saldo, histórico de lançamentos e prazos de vencimento.
            </p>
            <p className="text-[11px] text-rose-600 font-medium">Clique para ver seu saldo
            </p>
          </div>

          <ArrowRight className="size-5 text-rose-500 transition-transform duration-300 group-hover:translate-x-1" />
        </motion.div>
      </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setSeletorAberto(true)}>
          Acessar Sistema
          <ArrowRight className="ml-auto size-4" />
        </Button>

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