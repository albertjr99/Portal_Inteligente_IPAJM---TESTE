import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Event, Announcement, Document } from "@/types";

export function AdminContent() {
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Formulário de Eventos
  const [newEvent, setNewEvent] = useState({ title: "", date: "", time: "", description: "", type: "meeting", sectors: "" });
  const [newAnnouncement, setNewAnnouncement] = useState({ title: "", content: "", date: "", priority: "medium", author: "Admin", sectors: "" });
  const [newDocument, setNewDocument] = useState({ title: "", description: "", category: "Manuais", url: "", uploadDate: "", size: "1 MB", sectors: "" });

  const headers = { "Content-Type": "application/json" };

  const loadData = () => {
    fetch('/api/content/events').then(res => res.json()).then(setEvents).catch(console.error);
    fetch('/api/content/announcements').then(res => res.json()).then(setAnnouncements).catch(console.error);
    fetch('/api/content/documents').then(res => res.json()).then(setDocuments).catch(console.error);
  };

  useEffect(() => { loadData(); }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...newEvent, sectors: newEvent.sectors.split(",").map(s => s.trim()).filter(Boolean) };
    const res = await fetch("/api/content/events", { method: "POST", headers, body: JSON.stringify(payload) });
    if (res.ok) { toast.success("Evento criado!"); loadData(); setNewEvent({ title: "", date: "", time: "", description: "", type: "meeting", sectors: "" }); }
    else toast.error("Erro ao criar evento");
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...newAnnouncement, sectors: newAnnouncement.sectors.split(",").map(s => s.trim()).filter(Boolean) };
    const res = await fetch("/api/content/announcements", { method: "POST", headers, body: JSON.stringify(payload) });
    if (res.ok) { toast.success("Comunicado criado!"); loadData(); setNewAnnouncement({ title: "", content: "", date: "", priority: "medium", author: "Admin", sectors: "" }); }
    else toast.error("Erro ao criar comunicado");
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...newDocument, uploadDate: new Date().toISOString().split("T")[0], sectors: newDocument.sectors.split(",").map(s => s.trim()).filter(Boolean) };
    const res = await fetch("/api/content/documents", { method: "POST", headers, body: JSON.stringify(payload) });
    if (res.ok) { toast.success("Documento registrado!"); loadData(); setNewDocument({ title: "", description: "", category: "Manuais", url: "", uploadDate: "", size: "1 MB", sectors: "" }); }
    else toast.error("Erro ao registrar documento");
  };

  return (
    <div className="bg-card border rounded-lg p-6 shadow-sm mt-8">
      <h2 className="text-xl font-semibold mb-6 border-b pb-2">Gestão de Conteúdos</h2>
      <Tabs defaultValue="events" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="events">Eventos</TabsTrigger>
          <TabsTrigger value="announcements">Comunicados</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-6">
          <form onSubmit={handleCreateEvent} className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-md border">
            <Input placeholder="Título do Evento" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} required />
            <Input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required />
            <Input type="time" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} />
            <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}>
              <option value="meeting">Reunião</option><option value="deadline">Prazo</option><option value="holiday">Feriado</option><option value="training">Treinamento</option>
            </select>
            <Input placeholder="Descrição" className="col-span-2" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} required />
            <Input placeholder="Setores (separados por vírgula, ex: TI, RH)" className="col-span-2" value={newEvent.sectors} onChange={e => setNewEvent({...newEvent, sectors: e.target.value})} />
            <Button type="submit" className="col-span-2">Criar Evento</Button>
          </form>
          <div className="text-sm">Total cadastrado: {events.length}</div>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-6">
          <form onSubmit={handleCreateAnnouncement} className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-md border">
            <Input placeholder="Título" value={newAnnouncement.title} onChange={e => setNewAnnouncement({...newAnnouncement, title: e.target.value})} required />
            <Input type="date" value={newAnnouncement.date} onChange={e => setNewAnnouncement({...newAnnouncement, date: e.target.value})} required />
            <Input placeholder="Conteúdo" className="col-span-2" value={newAnnouncement.content} onChange={e => setNewAnnouncement({...newAnnouncement, content: e.target.value})} required />
            <select className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm" value={newAnnouncement.priority} onChange={e => setNewAnnouncement({...newAnnouncement, priority: e.target.value})}>
              <option value="low">Baixa</option><option value="medium">Média</option><option value="high">Alta</option>
            </select>
            <Input placeholder="Setores (separados por vírgula)" value={newAnnouncement.sectors} onChange={e => setNewAnnouncement({...newAnnouncement, sectors: e.target.value})} />
            <Button type="submit" className="col-span-2">Criar Comunicado</Button>
          </form>
          <div className="text-sm">Total cadastrado: {announcements.length}</div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          <form onSubmit={handleCreateDocument} className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-md border">
            <Input placeholder="Título do Documento" value={newDocument.title} onChange={e => setNewDocument({...newDocument, title: e.target.value})} required />
            <Input placeholder="Categoria (ex: Manuais)" value={newDocument.category} onChange={e => setNewDocument({...newDocument, category: e.target.value})} required />
            <Input placeholder="URL do Arquivo" value={newDocument.url} onChange={e => setNewDocument({...newDocument, url: e.target.value})} required />
            <Input placeholder="Setores (separados por vírgula)" value={newDocument.sectors} onChange={e => setNewDocument({...newDocument, sectors: e.target.value})} />
            <Input placeholder="Descrição" className="col-span-2" value={newDocument.description} onChange={e => setNewDocument({...newDocument, description: e.target.value})} required />
            <Button type="submit" className="col-span-2">Registrar Documento</Button>
          </form>
          <div className="text-sm">Total cadastrado: {documents.length}</div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
