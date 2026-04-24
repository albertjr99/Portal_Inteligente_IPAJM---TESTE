import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="space-y-6 max-w-md">
        <div className="text-8xl font-bold text-primary">404</div>
        <h1 className="text-3xl font-bold">Página Não Encontrada</h1>
        <p className="text-muted-foreground">
          Desculpe, a página que você está procurando não existe ou foi movida.
        </p>
        <Button asChild size="lg">
          <Link to="/">
            <Home className="mr-2 size-4" />
            Voltar ao Início
          </Link>
        </Button>
      </div>
    </div>
  );
}
