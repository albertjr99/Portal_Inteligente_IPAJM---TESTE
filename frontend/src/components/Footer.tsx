import { Link } from 'react-router-dom';
import { Shield, Computer } from 'lucide-react';
import { Separator } from './ui/separator';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/50 mt-auto">
      <div className="container mx-auto px-4 py-8 lg:py-6">
        
        <div className="flex flex-col items-center text-center gap-6">

          {/* Linha principal */}
          <div className="w-full flex flex-col md:flex-row items-center justify-between gap-6">

            {/* Esquerda - Brasão */}
            <div className="flex justify-center md:justify-start w-full md:w-auto">
              <img
                src="/assets/brasao-es.png"
                alt="Governo do Estado do ES"
                className="h-12 object-contain opacity-80"
              />
            </div>

            {/* Centro - Institucional */}
            <div className="max-w-xl">
              <h2 className="font-semibold text-sm uppercase tracking-wide">
                Instituto de Previdência dos Servidores do Estado do Espírito Santo
              </h2>

              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Av. Cezar Hilal, 1345 - Bento Ferreira<br />
                Vitória - ES • CEP 29050-903
              </p>

              <p className="text-sm text-muted-foreground mt-1">
                (27) 3636-4247 • suporte@ipajm.es.gov.br
              </p>
            </div>

            {/* Direita - Logo IPAJM */}
            <div className="flex justify-center md:justify-end w-full md:w-auto">
              <img
                src="/assets/logo-ipajm.png"
                alt="IPAJM"
                className="h-12 object-contain opacity-90"
              />
            </div>

          </div>
        </div>

        <Separator className="my-4" />

        {/* Rodapé final */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-muted-foreground/70">
          <div className="flex items-center gap-2">
            <Shield className="size-3" />
            <p>© {currentYear} IPAJM - Instituto de Previdência dos Servidores do Estado do Espírito Santo</p>
          </div>

          <div className="flex gap-4">
            <Link to="/terms" className="hover:text-primary transition-colors underline-offset-4 hover:underline">Políticas Internas</Link>
            <Link to="/admin" className="hover:text-primary transition-colors underline-offset-4 hover:underline flex items-center gap-1">
              <Computer className="size-3" />
              Área Administrativa
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}