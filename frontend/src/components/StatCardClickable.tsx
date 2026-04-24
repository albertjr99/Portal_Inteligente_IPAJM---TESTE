import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface StatCardClickableProps {
  label: string;
  value: string | null;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  loading: boolean;
  error?: boolean;
  detailsTitle?: string;
  detailsContent?: React.ReactNode;
  onDetailsClick?: () => void;
}

export function StatCardClickable({
  label,
  value,
  description,
  icon: Icon,
  color,
  bgColor,
  loading,
  error,
  detailsTitle,
  detailsContent,
  onDetailsClick,
}: StatCardClickableProps) {
  const [showDetails, setShowDetails] = useState(false);

  const handleClick = () => {
    if (onDetailsClick) {
      onDetailsClick();
    }
    setShowDetails(true);
  };

  const isClickable = !!detailsContent || !!onDetailsClick;

  return (
    <>
      <Card
        className={`overflow-hidden ${isClickable ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
        onClick={handleClick}
      >
        <CardContent className="p-4">
          <div className={`size-10 rounded-lg ${bgColor} flex items-center justify-center mb-3`}>
            <Icon className={`size-5 ${color}`} />
          </div>
          <p className="text-sm text-muted-foreground">{label}</p>
          {loading ? (
            <div className="h-8 w-14 rounded-md bg-muted animate-pulse mt-1 mb-1" />
          ) : error || value === null ? (
            <div className="flex items-center gap-1 mt-1">
              <AlertCircle className="size-4 text-amber-500" />
              <span className="text-sm text-amber-600 font-medium">N/D</span>
            </div>
          ) : (
            <p className="text-2xl font-bold">{value}</p>
          )}
          <p className="text-xs text-muted-foreground">{description}</p>
          {isClickable && !loading && !error && value !== null && (
            <p className="text-xs text-blue-600 font-medium mt-2">Clique para detalhes →</p>
          )}
        </CardContent>
      </Card>

      {/* Modal de detalhes */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailsTitle || label}</DialogTitle>
            <DialogDescription>
              {description}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {detailsContent}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
