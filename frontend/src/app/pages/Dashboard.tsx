import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { quickLinks, mockHRHighlights } from '@/data/mockData';
import { filterByProfile, filterBySector, getUpcomingEvents, getRecentAnnouncements, getDateLabel, formatRelativeTime, trackLinkClick, getTopLinks } from '@/utils/helpers';
import { Calendar, Bell, TrendingUp, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Event, Announcement } from '@/types';

export function Dashboard() {
  const { currentUser, logout } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    const rawToken = localStorage.getItem("token");
    const token = rawToken && rawToken !== "undefined" ? rawToken : null;
    const headers = token ? { 'Authorization': `Bearer ${token}` } : undefined;

    const personalEventsPromise = token
      ? fetch('/api/content/personal-events', { headers })
          .then(res => {
            if (res.status === 401) {
              logout();
              return [];
            }
            return res.ok ? res.json() : [];
          })
          .catch(() => [])
      : Promise.resolve([]);

    Promise.all([
      fetch('/api/content/events').then(res => res.ok ? res.json() : []),
      personalEventsPromise,
      fetch('/api/content/announcements').then(res => res.ok ? res.json() : [])
    ]).then(([eventsData, personalData, announcementsData]) => {
      const events = Array.isArray(eventsData) ? eventsData : [];
      const personal = Array.isArray(personalData) ? personalData : [];
      const ann = Array.isArray(announcementsData) ? announcementsData : [];
      setEvents([...events, ...personal]);
      setAnnouncements(ann);
    }).catch(console.error);
  }, []);

  if (!currentUser) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  const userLinks = filterByProfile(quickLinks, currentUser);
  const topLinks = getTopLinks(currentUser.id, userLinks, 4);

  const userEvents = filterBySector(
    getUpcomingEvents(events),
    currentUser.sector
  );
  const userAnnouncements = filterBySector(
    getRecentAnnouncements(announcements, 3),
    currentUser.sector
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  {/* 
    const profileLabels: Record<string, string> = {
      admin: 'Administrador',
      rh: 'Recursos Humanos',
      servidor: 'Servidor',
      gestor: 'Gestor',
    };
  */}

  return (
    <div className="space-y-3">
      {/* Welcome Section */}
      <div className="relative overflow-hidden rounded-lg bg-linear-to-br from-green-700 to-green-900 text-white px-6 py-3 -mt-5.5">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="size-5" />
            <span className="text-sm font-medium opacity-90">
              Portal IPAJM
            </span>
          </div>
          <h1 className="text-3xl font-bold mb-1">
            {getGreeting()}, {currentUser.firstName}!
          </h1>
          <p className="text-green-100">
            Bem-vindo ao seu espaço personalizado.<br />Aqui você encontra tudo o que precisa para o seu dia a dia de trabalho.
          </p>
        
          <div className="flex gap-2 mt-2">
            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
              {currentUser.sector}
            </Badge>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
      </div>

      {/* Dashboard Highlights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximos Eventos */}
        <Card className="flex flex-col border-none shadow-lg bg-white/80 backdrop-blur-md hover:shadow-xl transition-all duration-300">
          <CardHeader className="py-2 border border-gray-100/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                  <Calendar className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Próximos Eventos</CardTitle>
                  <CardDescription className="text-xs">Eventos deste mês</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {userEvents.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pt-2">
            <div className="space-y-2">
              {userEvents.length > 0 ? (
                userEvents.slice(0, 3).map((event) => (
                  <Link 
                    key={event.id} 
                    to="/events" 
                    className="group flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center min-w-10 h-10 bg-white border border-gray-100 rounded-xl shadow-xs group-hover:border-blue-200 group-hover:bg-blue-50 transition-all duration-300 relative">
                      {getDateLabel(event.date) && (
                        <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-blue-600 text-[8px] font-bold text-white rounded-full uppercase tracking-tighter">
                          {getDateLabel(event.date)}
                        </div>
                      )}
                      <span className="text-[10px] font-bold text-gray-400 uppercase">
                        {new Date(event.date + 'T12:00:00').toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}
                      </span>
                      <span className="text-xl font-black text-gray-900 leading-none">
                        {new Date(event.date + 'T12:00:00').getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600">
                        {event.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant="outline" className="text-[9px] py-0 h-4 bg-gray-50 border-gray-200 text-gray-600">
                          {event.type === 'personal' ? 'Pessoal' : 'Institucional'}
                        </Badge>
                        <span className="text-xs text-gray-400">•</span>
                        <p className="text-xs text-gray-500 truncate">
                          {event.time || 'Dia inteiro'}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 italic">Sem eventos próximos</p>
                </div>
              )}
            </div>
          </CardContent>
          <div className="pt-0 mt-auto">
            <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50/50 group" asChild>
              <Link to="/events">
                Ver todos
                <ArrowRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* Últimos Comunicados */}
        <Card className="flex flex-col border-none shadow-lg bg-white/80 backdrop-blur-md hover:shadow-xl transition-all duration-300">
          <CardHeader className="py-2 border border-gray-100/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                  <Bell className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Últimos Comunicados</CardTitle>
                  <CardDescription className="text-xs">Atualizações recentes</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                {userAnnouncements.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 pt-2">
            <div className="space-y-4">
              {userAnnouncements.length > 0 ? (
                userAnnouncements.slice(0, 3).map((announcement) => (
                  <Link 
                    key={announcement.id} 
                    to="/announcements" 
                    className="group flex items-start gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-center min-w-10 h-10 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors relative">
                      <Bell className="size-5 text-amber-500" />
                      <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate group-hover:text-amber-600">
                        {announcement.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatRelativeTime(announcement.date)}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-400 italic">Nenhum comunicado recente</p>
                </div>
              )}
            </div>
          </CardContent>
          <div className="pt-0 mt-auto">
            <Button variant="ghost" className="w-full text-amber-600 hover:text-amber-700 hover:bg-amber-50/50 group" asChild>
              <Link to="/announcements">
                Ver todos
                <ArrowRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </Card>

        {/* Links Rápidos */}
        <Card className="flex flex-col border-none shadow-lg bg-white/80 backdrop-blur-md hover:shadow-xl transition-all duration-300">
          <CardHeader className="py-2 border border-gray-100/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 rounded-md text-emerald-600">
                  <TrendingUp className="size-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Links Rápidos</CardTitle>
                  <CardDescription className="text-[11px]">
                    Mais acessados
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                {userLinks.length}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1">
            <div className="grid grid-cols-2 gap-2 h-full">
              {topLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackLinkClick(currentUser.id, link.id)}
                  className="flex flex-col items-center justify-center gap-1.5 p-5 rounded-xl border border-gray-100 bg-white/50 hover:border-emerald-200 hover:bg-emerald-50 hover:shadow-sm transition-all duration-300 group"
                >
                  <div className="p-3 bg-emerald-50 rounded-lg group-hover:scale-110 group-hover:bg-emerald-100 transition-all duration-300 mb-1">
                    <ArrowRight className="size-3 text-emerald-600" />
                  </div>

                  <span className="text-sm font-semibold text-gray-700 text-center line-clamp-2 group-hover:text-emerald-700">
                    {link.title}
                  </span>
                </a>
              ))}
            </div>
          </CardContent>

          <div className="pt-0 mt-auto">
            <Button variant="ghost" className="w-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50/50 group" asChild>
              <Link to="/quick-links">
                Ver todos
                <ArrowRight className="ml-2 size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>

      {/* HR Highlights */}
      <section>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Notícias em Destaque</h2>
          <p className="text-muted-foreground">
            Informações importantes sobre benefícios, vagas e treinamentos
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {mockHRHighlights.map((highlight) => (
            <Card key={highlight.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <Badge className="w-fit mb-2" variant={
                  highlight.type === 'vacancy' ? 'default' : 
                  highlight.type === 'training' ? 'secondary' : 'outline'
                }>
                  {highlight.type === 'benefit' && 'Benefício'}
                  {highlight.type === 'vacancy' && 'Vaga'}
                  {highlight.type === 'training' && 'Treinamento'}
                  {highlight.type === 'news' && 'Novidade'}
                </Badge>
                <CardTitle className="text-base">{highlight.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {highlight.description}
                </p>
                {highlight.link && (
                  <Button variant="link" className="p-0 h-auto" asChild>
                    <Link to={highlight.link}>
                      Saiba mais
                      <ArrowRight className="ml-1 size-3" />
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}