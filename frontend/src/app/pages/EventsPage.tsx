import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { EventCard } from '@/components/EventCard';
import { filterBySector } from '@/utils/helpers';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, List, Filter } from 'lucide-react';
import { Event } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function EventsPage() {
  const { currentUser, logout } = useAuth();
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  
  const [newEvent, setNewEvent] = useState<Partial<Event>>({ title: '', date: '', time: '', description: '', type: 'personal' });
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadEvents = () => {
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
      personalEventsPromise
    ]).then(([publicData, personalData]) => {
      const publicEvents = Array.isArray(publicData) ? publicData : [];
      const personal = Array.isArray(personalData) ? personalData : [];
      setEvents([...publicEvents, ...personal]);
    }).catch(console.error);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleCreatePersonalEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return toast.error("Você precisa estar logado.");

    try {
      const url = newEvent.id 
        ? `/api/content/personal-events/${newEvent.id}`
        : "/api/content/personal-events";
        
      const method = newEvent.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...newEvent, sectors: [] })
      });

      if (res.ok) {
        toast.success(newEvent.id ? "Lembrete atualizado com sucesso!" : "Lembrete criado com sucesso!");
        loadEvents();
        setIsModalOpen(false);
        setNewEvent({ title: '', date: '', time: '', description: '', type: 'personal' });
      } else {
        toast.error("Erro ao salvar lembrete");
      }
    } catch {
      toast.error("Erro de conexão");
    }
  };

  const handleDeletePersonalEvent = async (eventId: string) => {
    if (!window.confirm("Deseja realmente excluir este lembrete?")) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`/api/content/personal-events/${eventId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Lembrete excluído com sucesso");
        loadEvents();
      } else {
        toast.error("Erro ao excluir lembrete");
      }
    } catch {
      toast.error("Erro de conexão");
    }
  };

  const handleEditEvent = (event: Event) => {
    setNewEvent(event);
    setIsModalOpen(true);
  };

  const resetForm = (open: boolean) => {
    setIsModalOpen(open);
    if (!open) {
      setNewEvent({ title: '', date: '', time: '', description: '', type: 'personal' });
    }
  };

  if (!currentUser) return null;

  const userEvents = filterBySector(events, currentUser.sector);

  const eventDates = userEvents.map(e => new Date(e.date + 'T12:00:00'));
  
  const eventsOnSelectedDate = selectedDate
    ? userEvents.filter(
        (e) => new Date(e.date + 'T12:00:00').toDateString() === selectedDate.toDateString()
      )
    : [];

  const filteredEvents = selectedType === 'all' 
    ? userEvents 
    : selectedType === 'personal'
      ? userEvents.filter(event => event.type === 'personal' || (event.sectors && event.sectors.includes('personal')))
      : userEvents.filter(event => event.type === selectedType);

  const upcomingEvents = filteredEvents.filter(
    event => {
      const cleanDate = event.date.includes('T') ? event.date : `${event.date}T12:00:00`;
      return new Date(cleanDate) >= new Date(new Date().setHours(0, 0, 0, 0));
    }
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastEvents = filteredEvents.filter(
    event => {
      const cleanDate = event.date.includes('T') ? event.date : `${event.date}T12:00:00`;
      return new Date(cleanDate) < new Date(new Date().setHours(0, 0, 0, 0));
    }
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const eventTypes = [
    { value: 'all', label: 'Todos', count: userEvents.length },
    { value: 'meeting', label: 'Reuniões', count: userEvents.filter(e => e.type === 'meeting').length },
    { value: 'deadline', label: 'Prazos', count: userEvents.filter(e => e.type === 'deadline').length },
    { value: 'holiday', label: 'Feriados', count: userEvents.filter(e => e.type === 'holiday').length },
    { value: 'training', label: 'Treinamentos', count: userEvents.filter(e => e.type === 'training').length },
    { value: 'personal', label: 'Meus Lembretes', count: userEvents.filter(e => e.type === 'personal' || (e.sectors && e.sectors.includes('personal'))).length },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Eventos e Calendário</h1>
          <p className="text-muted-foreground">
            Acompanhe reuniões, prazos, feriados e seus lembretes pessoais
          </p>
        </div>

        <Dialog open={isModalOpen} onOpenChange={resetForm}>
          <DialogTrigger asChild>
            <Button>+ Novo Lembrete</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{newEvent.id ? 'Editar Lembrete' : 'Adicionar Lembrete Pessoal'}</DialogTitle>
              <DialogDescription>
                Este evento será visível apenas para você no seu calendário.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePersonalEvent} className="space-y-4 mt-4">
              <Input placeholder="Título do Lembrete" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required />
              <Select value={newEvent.type} onValueChange={(val) => setNewEvent({...newEvent, type: val as Event['type']})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Meus Lembretes</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="training">Treinamento</SelectItem>
                  <SelectItem value="deadline">Prazo</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-4">
                <Input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required />
                <Input 
                  type="time" 
                  value={newEvent.time} 
                  onChange={e => {
                    setNewEvent({...newEvent, time: e.target.value});
                    // O picker nativo só preenche o value quando o horário estiver completo (HH:mm)
                    // Ao dar blur(), forçamos a caixa de diálogo nativa a fechar sozinha.
                    if (e.target.value) e.target.blur();
                  }} 
                />
              </div>
              <Input placeholder="Descrição" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} required />
              <Button type="submit" className="w-full">Salvar Lembrete</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtrar por tipo:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {eventTypes.map((type) => (
              <Button
                key={type.value}
                variant={selectedType === type.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type.value)}
              >
                {type.label}
                <Badge 
                  variant="secondary" 
                  className="ml-2"
                >
                  {type.count}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Janelas de Eventos */}
      <Tabs defaultValue="upcoming" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upcoming" className="gap-2">
            <CalendarIcon className="size-4" />
            Próximos ({upcomingEvents.length})
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            <List className="size-4" />
            Passados ({pastEvents.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-4">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} onEdit={handleEditEvent} onDelete={handleDeletePersonalEvent} />
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarIcon className="size-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhum evento próximo encontrado
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-4">
          {pastEvents.length > 0 ? (
            pastEvents.map((event) => (
              <EventCard key={event.id} event={event} onEdit={handleEditEvent} onDelete={handleDeletePersonalEvent} />
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <List className="size-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhum evento passado encontrado
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        </Tabs>
        </div>

        {/* Lado Direito: Calendário Visual */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="sticky top-24">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Calendário de Eventos</CardTitle>
              <CardDescription>Acompanhe visualmente as datas</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  hasEvent: eventDates,
                }}
                modifiersClassNames={{
                  hasEvent: "bg-primary/20 text-primary font-bold after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full",
                }}
                className="rounded-md border w-full max-w-70"
              />

              {/* Lista dos eventos no dia selecionado */}
              <div className="mt-6 w-full space-y-3">
                <h3 className="text-sm font-semibold border-b pb-2">
                  Eventos do Dia
                </h3>
                {eventsOnSelectedDate.length > 0 ? (
                  eventsOnSelectedDate.map((event) => (
                    <div key={event.id} className="text-sm p-3 bg-muted rounded-md border text-left">
                      <p className="font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{event.type === 'holiday' ? 'Feriado' : event.time}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum evento neste dia.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

    </div>
  );
}