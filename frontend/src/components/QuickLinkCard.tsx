import { Link } from 'react-router-dom';
import * as LucideIcons from 'lucide-react';
import { QuickLink } from '@/types';

interface QuickLinkCardProps {
  link: QuickLink;
}

export function QuickLinkCard({ link }: QuickLinkCardProps) {
  const IconComponent = (LucideIcons as any)[link.icon] || LucideIcons.Link;

  const cardClasses = "flex flex-col items-center justify-center p-6 rounded-lg border bg-card hover:bg-accent hover:shadow-md transition-all group";

  if (link.external) {
    return (
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClasses}
      >
        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
          <IconComponent className="size-6 text-primary" />
        </div>
        <span className="text-sm font-medium text-center">{link.title}</span>
      </a>
    );
  }

  return (
    <Link
      to={link.url}
      className={cardClasses}
    >
      <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
        <IconComponent className="size-6 text-primary" />
      </div>
      <span className="text-sm font-medium text-center">{link.title}</span>
    </Link>
  );
}