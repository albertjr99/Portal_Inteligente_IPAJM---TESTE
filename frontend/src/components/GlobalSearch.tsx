import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from './ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { mockAnnouncements, mockFAQs, mockDocuments, quickLinks } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';
import { filterByProfile, searchItems } from '../utils/helpers';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const { currentUser } = useAuth();

  // Envia pesquisa automaticamente
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 2000); // Espera 2000ms depois do usuário parar de digitar

    return () => clearTimeout(timer);
  }, [query]);

  // Abre/fecha diálogo com base no comprimeto da consulta
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [debouncedQuery]);

  const handleSearch = (value: string) => {
    setQuery(value);
  };

  const userLinks = currentUser ? filterByProfile(quickLinks, currentUser) : [];
  
  const searchResults = debouncedQuery.length >= 2 ? {
    links: searchItems(userLinks, debouncedQuery).slice(0, 3),
    announcements: searchItems(mockAnnouncements, debouncedQuery).slice(0, 3),
    faqs: searchItems(mockFAQs, debouncedQuery).slice(0, 3),
    documents: searchItems(mockDocuments, debouncedQuery).slice(0, 3),
  } : null;

  const hasResults = searchResults && (
    searchResults.links.length > 0 ||
    searchResults.announcements.length > 0 ||
    searchResults.faqs.length > 0 ||
    searchResults.documents.length > 0
  );

  return (
    <>
      <div className="relative w-full max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar no portal..."
          className="pl-10"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resultados da Busca</DialogTitle>
            <DialogDescription>
              {query.length < 2 
                ? `Digite pelo menos 2 caracteres para buscar (${query.length}/2)`
                : `Buscando por "${debouncedQuery}"`
              }
            </DialogDescription>
          </DialogHeader>

          {query.length < 2 ? (
            <div className="text-center py-8 text-muted-foreground">
              Continue digitando para ver os resultados...
            </div>
          ) : !hasResults ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum resultado encontrado
            </div>
          ) : null}

          {searchResults && (
            <div className="space-y-6">
              {searchResults.links.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    Links Rápidos
                    <Badge variant="secondary">{searchResults.links.length}</Badge>
                  </h3>
                  <div className="space-y-2">
                    {searchResults.links.map((link) => (
                      <div
                        key={link.id}
                        className="p-3 rounded-md border hover:bg-accent cursor-pointer"
                        onClick={() => setOpen(false)}
                      >
                        <div className="font-medium">{link.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.announcements.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    Comunicados
                    <Badge variant="secondary">{searchResults.announcements.length}</Badge>
                  </h3>
                  <div className="space-y-2">
                    {searchResults.announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className="p-3 rounded-md border hover:bg-accent cursor-pointer"
                      >
                        <div className="font-medium">{announcement.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {announcement.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.faqs.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    Perguntas Frequentes
                    <Badge variant="secondary">{searchResults.faqs.length}</Badge>
                  </h3>
                  <div className="space-y-2">
                    {searchResults.faqs.map((faq) => (
                      <div
                        key={faq.id}
                        className="p-3 rounded-md border hover:bg-accent cursor-pointer"
                      >
                        <div className="font-medium">{faq.question}</div>
                        <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {faq.answer}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults.documents.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    Documentos
                    <Badge variant="secondary">{searchResults.documents.length}</Badge>
                  </h3>
                  <div className="space-y-2">
                    {searchResults.documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 rounded-md border hover:bg-accent cursor-pointer"
                      >
                        <div className="font-medium">{doc.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {doc.description}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}