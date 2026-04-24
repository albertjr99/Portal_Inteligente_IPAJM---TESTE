import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Announcement } from '@/types';
import { formatDate } from '@/utils/helpers';

interface AnnouncementCardProps {
  announcement: Announcement;
  onClick?: () => void;
}

const priorityStyles = {
  high: { 
    icon: AlertCircle, 
    color: 'text-red-500', 
    badge: 'bg-red-100 text-red-700 border-red-200',
    label: 'Alta' 
  },
  medium: { 
    icon: AlertTriangle, 
    color: 'text-orange-500', 
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    label: 'Média' 
  },
  low: { 
    icon: Info, 
    color: 'text-blue-500', 
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    label: 'Baixa' 
  },
};

export function AnnouncementCard({ announcement, onClick }: AnnouncementCardProps) {
  const priority = priorityStyles[announcement.priority];
  const Icon = priority.icon;

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1">
            <Icon className={`size-5 ${priority.color} shrink-0 mt-0.5`} />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base">{announcement.title}</CardTitle>
              <CardDescription className="text-xs mt-1">
                {announcement.author} • {formatDate(announcement.date)}
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={priority.badge}>
            {priority.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {announcement.content}
        </p>
      </CardContent>
    </Card>
  );
}
