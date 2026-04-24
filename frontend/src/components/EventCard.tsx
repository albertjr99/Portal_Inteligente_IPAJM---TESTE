import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Calendar, Pencil, Trash2 } from 'lucide-react';
import { Event } from '@/types';
import { formatDateTime } from '@/utils/helpers';

import { Button } from './ui/button';
import { useAuth } from '@/contexts/AuthContext';

interface EventCardProps {
  event: Event;
  onEdit?: (event: Event) => void;
  onDelete?: (eventId: string) => void;
}

const eventTypeStyles = {
  meeting: { color: 'bg-blue-500', label: 'Reunião' },
  deadline: { color: 'bg-red-500', label: 'Prazo' },
  holiday: { color: 'bg-green-500', label: 'Feriado' },
  training: { color: 'bg-purple-500', label: 'Treinamento' },
  personal: { color: 'bg-orange-500', label: 'Pessoal' },
};

export function EventCard({ event, onEdit, onDelete }: EventCardProps) {
  const typeStyle = eventTypeStyles[event.type as keyof typeof eventTypeStyles] || { color: 'bg-gray-500', label: 'Evento' };
  const { currentUser } = useAuth();
  const isOwner = currentUser?.username === event.owner_username;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{event.title}</CardTitle>
          <div className="flex items-center gap-2">
            {isOwner && onEdit && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground" onClick={() => onEdit(event)}>
                <Pencil className="size-3" />
              </Button>
            )}
            {isOwner && onDelete && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDelete(event.id)}>
                <Trash2 className="size-3" />
              </Button>
            )}
            <Badge className={`${typeStyle.color} text-white shrink-0`}>
              {typeStyle.label}
            </Badge>
          </div>
        </div>
        <CardDescription className="flex items-center gap-2 mt-2">
          <Calendar className="size-4" />
          {formatDateTime(event.date, event.time)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{event.description}</p>
      </CardContent>
    </Card>
  );
}
