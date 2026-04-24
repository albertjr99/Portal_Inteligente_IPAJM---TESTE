import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AnnouncementCard } from '@/components/AnnouncementCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { mockAnnouncements } from '@/data/mockData';
import { filterBySector, formatDate } from '@/utils/helpers';
import { Bell, Filter } from 'lucide-react';
import { Announcement } from '@/types';

export function AnnouncementsPage() {
  const { currentUser } = useAuth();
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  if (!currentUser) return null;

  const userAnnouncements = filterBySector(mockAnnouncements, currentUser.sector)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredAnnouncements = selectedPriority === 'all'
    ? userAnnouncements
    : userAnnouncements.filter(announcement => announcement.priority === selectedPriority);

  const priorities = [
    { value: 'all', label: 'Todos', count: userAnnouncements.length },
    { value: 'high', label: 'Alta Prioridade', count: userAnnouncements.filter(a => a.priority === 'high').length },
    { value: 'medium', label: 'Média Prioridade', count: userAnnouncements.filter(a => a.priority === 'medium').length },
    { value: 'low', label: 'Baixa Prioridade', count: userAnnouncements.filter(a => a.priority === 'low').length },
  ];

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Comunicados</h1>
        <p className="text-muted-foreground">
          Fique informado sobre as últimas novidades e atualizações
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filtrar por prioridade:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {priorities.map((priority) => (
              <Button
                key={priority.value}
                variant={selectedPriority === priority.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPriority(priority.value)}
              >
                {priority.label}
                <Badge variant="secondary" className="ml-2">
                  {priority.count}
                </Badge>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lista Anúncios */}
      <div className="space-y-4">
        {filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onClick={() => setSelectedAnnouncement(announcement)}
            />
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="size-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                Nenhum comunicado encontrado
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detalhes do Comunicado */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <DialogTitle className="text-2xl">
                    {selectedAnnouncement.title}
                  </DialogTitle>
                  <Badge
                    variant="outline"
                    className={
                      selectedAnnouncement.priority === 'high'
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : selectedAnnouncement.priority === 'medium'
                          ? 'bg-orange-100 text-orange-700 border-orange-200'
                          : 'bg-blue-100 text-blue-700 border-blue-200'
                    }
                  >
                    {selectedAnnouncement.priority === 'high' && 'Alta Prioridade'}
                    {selectedAnnouncement.priority === 'medium' && 'Média Prioridade'}
                    {selectedAnnouncement.priority === 'low' && 'Baixa Prioridade'}
                  </Badge>
                </div>
                <DialogDescription>
                  Publicado por {selectedAnnouncement.author} em {formatDate(selectedAnnouncement.date)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-muted-foreground leading-relaxed">
                  {selectedAnnouncement.content}
                </p>
                {selectedAnnouncement.attachments && selectedAnnouncement.attachments.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Anexos:</h4>
                    <div className="space-y-2">
                      {selectedAnnouncement.attachments.map((attachment, index) => (
                        <Button key={index} variant="outline" className="w-full justify-start">
                          {attachment}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
