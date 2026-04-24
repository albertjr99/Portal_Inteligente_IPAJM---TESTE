import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { mockFAQs } from '@/data/mockData';
import { searchItems } from '@/utils/helpers';
import { Search, HelpCircle } from 'lucide-react';

export function FAQPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQs = searchQuery.length >= 2
    ? searchItems(mockFAQs, searchQuery)
    : mockFAQs;

  const categories = Array.from(new Set(mockFAQs.map(faq => faq.category)));
  const faqsByCategory = categories.map(category => ({
    category,
    faqs: filteredFAQs.filter(faq => faq.category === category),
  })).filter(group => group.faqs.length > 0);

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Perguntas Frequentes</h1>
        <p className="text-muted-foreground">
          Encontre respostas para as dúvidas mais comuns
        </p>
      </div>

      {/* Pesquisa */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar nas perguntas frequentes..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {searchQuery.length >= 2 && (
            <p className="text-sm text-muted-foreground mt-3">
              {filteredFAQs.length} resultado(s) encontrado(s)
            </p>
          )}
        </CardContent>
      </Card>

      {/* FAQs por categoria */}
      {faqsByCategory.length > 0 ? (
        <div className="space-y-6">
          {faqsByCategory.map(({ category, faqs }) => (
            <Card key={category}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {category}
                  <Badge variant="secondary">{faqs.length}</Badge>
                </CardTitle>
                <CardDescription>
                  Perguntas sobre {category.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <HelpCircle className="size-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery.length >= 2
                ? 'Nenhuma pergunta encontrada para sua busca'
                : 'Nenhuma pergunta disponível'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sessão de Ajuda */}
      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Não encontrou o que procura?</CardTitle>
          <CardDescription>
            Entre em contato com o suporte para mais informações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <strong>Email:</strong> suporte@ipajm.es.gov.br
          </p>
          <p className="text-sm">
            <strong>Telefone:</strong> (27) 3333-4444 - Ramal 250
          </p>
          <p className="text-sm">
            <strong>Horário:</strong> Segunda a Sexta, 8h às 18h
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
