import React, { useState, useRef, useCallback, useEffect } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Link } from 'react-router';
import {
  ArrowUpDown,
  SlidersHorizontal,
  Plus,
  Check,
  RotateCcw,
  GripVertical,
  Pencil,
  X,
  Search,
  ExternalLink,
  Link as LinkIcon,
  CheckCircle2,
  Info,
  Home,
  Settings,
  Users,
  Briefcase,
  DollarSign,
  FileText,
  Clock,
  Heart,
  FolderOpen,
  GraduationCap,
  MessageSquare,
  Receipt,
  CalendarDays,
  Database,
  Monitor,
  ShoppingCart,
  CreditCard,
  Newspaper,
  User,
  Building2,
  ClipboardCheck,
  Link2,
  Star,
  Bookmark,
  Bell,
  Shield,
  Globe,
  Phone,
  Mail,
  Calculator,
  Download,
  Upload,
  Lock,
  Eye,
  Zap,
  Target,
  Award,
  BarChart2,
  Package,
  Printer,
  Map,
  Tag,
  Layers,
  PieChart,
  TrendingUp,
  AlertCircle,
  Key,
  Landmark,
  Scale,
  Wallet,
  LucideIcon,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { quickLinks } from '@/data/mockData';
import { filterByProfile, trackLinkClick } from '@/utils/helpers';
import { QuickLink } from '@/types';
import { toast } from 'sonner';

// Ícones disponíveis para personalização 
const ICON_OPTIONS = [
  'Home', 'Settings', 'Users', 'Briefcase', 'DollarSign', 'FileText',
  'Clock', 'Heart', 'FolderOpen', 'GraduationCap', 'MessageSquare',
  'Receipt', 'CalendarDays', 'Database', 'Monitor', 'ShoppingCart',
  'CreditCard', 'Newspaper', 'User', 'Building2', 'ClipboardCheck',
  'Link2', 'Star', 'Bookmark', 'Bell', 'Shield', 'Globe', 'Phone',
  'Mail', 'Calculator', 'Download', 'Upload', 'Lock', 'Eye',
  'Zap', 'Target', 'Award', 'BarChart2', 'Package', 'Printer',
  'Map', 'Tag', 'Layers', 'PieChart', 'TrendingUp', 'AlertCircle',
  'CheckCircle2', 'Info', 'Key', 'Landmark', 'Scale', 'Wallet',
];

const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  Settings,
  Users,
  Briefcase,
  DollarSign,
  FileText,
  Clock,
  Heart,
  FolderOpen,
  GraduationCap,
  MessageSquare,
  Receipt,
  CalendarDays,
  Database,
  Monitor,
  ShoppingCart,
  CreditCard,
  Newspaper,
  User,
  Building2,
  ClipboardCheck,
  Link2,
  Star,
  Bookmark,
  Bell,
  Shield,
  Globe,
  Phone,
  Mail,
  Calculator,
  Download,
  Upload,
  Lock,
  Eye,
  Zap,
  Target,
  Award,
  BarChart2,
  Package,
  Printer,
  Map,
  Tag,
  Layers,
  PieChart,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Info,
  Key,
  Landmark,
  Scale,
  Wallet,
};

// Auxiliares do localStorage 
const STORAGE_KEY = (userId: string) => `ipajm-quick-links-v2-${userId}`;

const loadFromStorage = (
  userId: string,
  defaultExt: QuickLink[],
  defaultInt: QuickLink[]
): { external: QuickLink[]; internal: QuickLink[] } => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY(userId));
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        external: Array.isArray(parsed.external) ? (parsed.external as QuickLink[]) : defaultExt,
        internal: Array.isArray(parsed.internal) ? (parsed.internal as QuickLink[]) : defaultInt,
      };
    }
  } catch {
    /* ignorar */
  }
  return { external: defaultExt, internal: defaultInt };
};

const saveToStorage = (userId: string, external: QuickLink[], internal: QuickLink[]) => {
  try {
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify({ external, internal }));
  } catch {
    /* ignorar */
  }
};

// Tipos de Arrastar e Soltar (DnD)
const DND_TYPES = {
  external: 'IPAJM_EXTERNAL_LINK',
  internal: 'IPAJM_INTERNAL_LINK',
} as const;

// Cartão de Link Arrastável (DraggableLinkCard)
interface DraggableLinkCardProps {
  link: QuickLink;
  index: number;
  currentUserId: string;
  sectionType: 'external' | 'internal';
  isEditMode: boolean;
  moveCard: (from: number, to: number) => void;
  onEdit: (link: QuickLink) => void;
  onRemove: (id: string) => void;
}

function DraggableLinkCard({
  link,
  index,
  sectionType,
  isEditMode,
  moveCard,
  onEdit,
  onRemove,
  currentUserId
}: DraggableLinkCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const dndType = DND_TYPES[sectionType];
  const IconComponent = ICON_MAP[link.icon] || Link2;

  const [{ isDragging }, drag] = useDrag({
    type: dndType,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    canDrag: () => isEditMode,
  });

  const [, drop] = useDrop<{ index: number }>({
    accept: dndType,
    hover(item, monitor) {
      if (!ref.current || !isEditMode) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;

      const rect = ref.current.getBoundingClientRect();
      const midX = (rect.left + rect.right) / 2;
      const midY = (rect.top + rect.bottom) / 2;
      const offset = monitor.getClientOffset();
      if (!offset) return;

      // Permitir troca quando o cursor cruzar o ponto médio (horizontal ou vertical).
      if (dragIndex < hoverIndex && offset.x < midX && offset.y < midY) return;
      if (dragIndex > hoverIndex && offset.x > midX && offset.y > midY) return;

      moveCard(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  drag(drop(ref));

  if (isEditMode) {
    return (
      <div
        ref={ref}
        style={{ opacity: isDragging ? 0.35 : 1, cursor: isDragging ? 'grabbing' : 'grab' }}
        className={`relative flex flex-col items-center p-3 pt-7 pb-3 rounded-xl border-2 border-dashed transition-all select-none ${
          isDragging
            ? 'border-primary bg-primary/5 shadow-lg scale-95'
            : 'border-border/60 bg-card hover:border-primary/40 hover:bg-accent/40'
        }`}
      >
        {/* Barra de rolagem */}
        <div className="absolute top-1.5 left-1/2 -translate-x-1/2 text-muted-foreground/40">
          <GripVertical className="size-4" />
        </div>

        {/* Botões de ação */}
        <div className="absolute top-1 right-1 flex gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onEdit(link);
            }}
            className="size-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Editar"
          >
            <Pencil className="size-3" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove(link.id);
            }}
            className="size-5 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            title="Remover"
          >
            <X className="size-3" />
          </button>
        </div>

        <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center mb-2 shrink-0">
          <IconComponent className="size-4 text-primary" />
        </div>
        <span className="text-xs font-medium text-center leading-tight line-clamp-2 max-w-full">
          {link.title}
        </span>
      </div>
    );
  }

  // Modo de visualização
  const cardClasses =
    'flex flex-col items-center justify-center p-6 rounded-xl border bg-card hover:bg-accent hover:shadow-md transition-all group';

  if (link.external) {
    return (
      <div ref={ref}>
        <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClasses}
        onClick={() => trackLinkClick(currentUserId, link.id)}>
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
            <IconComponent className="size-6 text-primary" />
          </div>
          <span className="text-sm font-medium text-center leading-snug">{link.title}</span>
        </a>
      </div>
    );
  }

  return (
    <div ref={ref}>
      <Link to={link.url} className={cardClasses} onClick={() => trackLinkClick(currentUserId, link.id)}>
        <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
          <IconComponent className="size-6 text-primary" />
        </div>
        <span className="text-sm font-medium text-center leading-snug">{link.title}</span>
      </Link>
    </div>
  );
}

// Modal de Edição de Link (EditLinkModal)
interface EditLinkModalProps {
  link: QuickLink | null;
  onSave: (id: string, title: string, icon: string) => void;
  onClose: () => void;
}

function EditLinkModal({ link, onSave, onClose }: EditLinkModalProps) {
  const [title, setTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('Link2');
  const [iconSearch, setIconSearch] = useState('');

  useEffect(() => {
    if (link) {
      setTitle(link.title);
      setSelectedIcon(link.icon || 'Link2');
      setIconSearch('');
    }
  }, [link?.id]);

  const filteredIcons = ICON_OPTIONS.filter((icon) =>
    icon.toLowerCase().includes(iconSearch.toLowerCase())
  );

 const SelectedIcon: LucideIcon = ICON_MAP[selectedIcon] || Link2;

  return (
    <Dialog open={!!link} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Link</DialogTitle>
          <DialogDescription>
            Personalize o nome e ícone deste link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Entrada de título */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-link-title">Nome do Link</Label>
            <Input
              id="edit-link-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome do link"
              maxLength={32}
              autoComplete="off"
            />
          </div>

          {/* Seletor de Ícones */}
          <div className="space-y-1.5">
            <Label>Ícone</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input
                value={iconSearch}
                onChange={(e) => setIconSearch(e.target.value)}
                placeholder="Buscar ícone..."
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-9 gap-1 max-h-44 overflow-y-auto border rounded-lg p-2 bg-muted/20">
              {filteredIcons.map((iconName) => {
                const Icon: LucideIcon = ICON_MAP[iconName] || Link2;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    title={iconName}
                    className={`size-8 flex items-center justify-center rounded-md transition-colors ${
                      selectedIcon === iconName
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'hover:bg-accent text-foreground'
                    }`}
                  >
                    <Icon className="size-4" />
                  </button>
                );
              })}
              {filteredIcons.length === 0 && (
                <div className="col-span-9 py-4 text-center text-sm text-muted-foreground">
                  Nenhum ícone encontrado
                </div>
              )}
            </div>
          </div>

          {/* Pré-visualização */}
          <div className="flex items-center gap-3 p-3 bg-accent/50 rounded-lg border">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <SelectedIcon className="size-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Pré-visualização</p>
              <p className="text-sm font-medium">{title || 'Nome do link'}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => link && title.trim() && onSave(link.id, title.trim(), selectedIcon)}
            disabled={!title.trim()}
          >
            Salvar Alterações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Modal de Adicionar Link (AddLinkModal)
interface AddLinkModalProps {
  open: boolean;
  availableLinks: QuickLink[];
  onAdd: (links: QuickLink[]) => void;
  onClose: () => void;
}

function AddLinkModal({ open, availableLinks, onAdd, onClose }: AddLinkModalProps) {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (!open) setSelected([]);
  }, [open]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleAdd = () => {
    const toAdd = availableLinks.filter((l) => selected.includes(l.id));
    onAdd(toAdd);
    setSelected([]);
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Adicionar Links</DialogTitle>
          <DialogDescription>
            Selecione os links disponíveis para adicionar à seção.
          </DialogDescription>
        </DialogHeader>

        {availableLinks.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 className="size-12 mx-auto mb-3 text-primary/30" />
            <p className="text-sm text-muted-foreground">
              Todos os links disponíveis já estão nesta seção.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-0.5">
            {availableLinks.map((link) => {
              const Icon: LucideIcon = ICON_MAP[link.icon] || Link2;
              const isSel = selected.includes(link.id);
              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => toggle(link.id)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                    isSel
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-transparent hover:bg-accent'
                  }`}
                >
                  <div
                    className={`size-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      isSel ? 'bg-primary/20' : 'bg-muted'
                    }`}
                  >
                    <Icon className={`size-4 ${isSel ? 'text-primary' : 'text-foreground'}`} />
                  </div>
                  <span className="text-sm font-medium flex-1 text-left">{link.title}</span>
                  <div
                    className={`size-4 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
                      isSel
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/40'
                    }`}
                  >
                    {isSel && <Check className="size-2.5 text-primary-foreground" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {availableLinks.length > 0 && (
            <Button onClick={handleAdd} disabled={selected.length === 0}>
              {selected.length > 0
                ? `Adicionar (${selected.length})`
                : 'Selecione links'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Seção de Links Rápidos (QuickLinksSection)
interface QuickLinksSectionProps {
  title: string;
  description: string;
  headerIcon: React.ReactNode;
  links: QuickLink[];
  sectionType: 'external' | 'internal';
  isEditMode: boolean;
  availableToAdd: QuickLink[];
  currentUserId: string;
  onToggleEdit: () => void;
  onMoveCard: (from: number, to: number) => void;
  onEditLink: (link: QuickLink) => void;
  onRemoveLink: (id: string) => void;
  onAddLinks: (links: QuickLink[]) => void;
  onRestoreDefaults: () => void;
}

function QuickLinksSection({
  title,
  description,
  headerIcon,
  links,
  sectionType,
  isEditMode,
  availableToAdd,
  currentUserId,
  onToggleEdit,
  onMoveCard,
  onEditLink,
  onRemoveLink,
  onAddLinks,
  onRestoreDefaults,
}: QuickLinksSectionProps) {
  const [showAddModal, setShowAddModal] = useState(false);

  return (
    <section>
      <Card
        className={`transition-all duration-200 ${
          isEditMode ? 'ring-2 ring-primary/25 shadow-lg' : 'shadow-sm'
        }`}
      >
        <CardHeader className="pb-3">
          {/* Seção da linha do cabeçalho */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {headerIcon}
              <CardTitle className="truncate">{title}</CardTitle>
              {isEditMode && (
                <Badge
                  variant="outline"
                  className="text-primary border-primary/40 bg-primary/5 shrink-0 hidden sm:flex"
                >
                  Modo edição
                </Badge>
              )}
            </div>

            {/* Botões de ação */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isEditMode ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onRestoreDefaults();
                    }}
                    className="text-muted-foreground hover:text-foreground gap-1.5 h-8"
                    title="Restaurar links padrão desta seção"
                  >
                    <RotateCcw className="size-3.5" />
                    <span className="hidden sm:inline text-xs">Restaurar</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddModal(true)}
                    disabled={availableToAdd.length === 0}
                    className="gap-1.5 h-8"
                    title={
                      availableToAdd.length === 0
                        ? 'Todos os links disponíveis já foram adicionados'
                        : 'Adicionar novos links'
                    }
                  >
                    <Plus className="size-3.5" />
                    <span className="hidden sm:inline text-xs">Adicionar</span>
                  </Button>
                  <Button
                    size="sm"
                    onClick={onToggleEdit}
                    className="gap-1.5 h-8 bg-primary hover:bg-primary/90"
                  >
                    <Check className="size-3.5" />
                    <span className="text-xs">Concluir</span>
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onToggleEdit}
                  className="gap-1.5 h-8"
                >
                  <SlidersHorizontal className="size-3.5" />
                  <span className="text-xs">Personalizar</span>
                </Button>
              )}
            </div>
          </div>

          <CardDescription className="mt-1">
            {isEditMode
              ? 'Arraste os cards para reordenar. Use os botões para editar ou remover.'
              : description}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {links.length === 0 && !isEditMode ? (
            <div className="py-10 text-center text-muted-foreground border-2 border-dashed rounded-xl">
              <Info className="size-8 mx-auto mb-2 text-muted-foreground/40" />
              <p className="text-sm">
                Nenhum link nesta seção.{' '}
                <button
                  type="button"
                  onClick={onToggleEdit}
                  className="text-primary underline underline-offset-2 hover:no-underline"
                >
                  Clique para personalizar
                </button>
              </p>
            </div>
          ) : (
            <div
              className={`grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 ${
                !isEditMode ? 'gap-4' : ''
              }`}
            >
              {links.map((link, index) => (
                <DraggableLinkCard
                  key={link.id}
                  link={link}
                  index={index}
                  sectionType={sectionType}
                  isEditMode={isEditMode}
                  moveCard={onMoveCard}
                  onEdit={onEditLink}
                  onRemove={onRemoveLink}
                  currentUserId={currentUserId}
                />
              ))}

              {/* Cartão fantasma "adicionar" embutido exibido no modo de edição */}
              {isEditMode && availableToAdd.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="flex flex-col items-center justify-center p-3 pt-7 pb-3 rounded-xl border-2 border-dashed border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/40 transition-all text-muted-foreground min-h-22.5"
                >
                  <Plus className="size-5 mb-1" />
                  <span className="text-xs">Adicionar</span>
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AddLinkModal
        open={showAddModal}
        availableLinks={availableToAdd}
        onAdd={(newLinks) => {
          onAddLinks(newLinks);
          setShowAddModal(false);
          toast.success(
            `${newLinks.length} link${newLinks.length > 1 ? 's' : ''} adicionado${newLinks.length > 1 ? 's' : ''}!`
          );
        }}
        onClose={() => setShowAddModal(false)}
      />
    </section>
  );
}

// Página Principal de Links Rápidos (Main QuickLinksPage)
export function QuickLinksPage() {
  const { currentUser } = useAuth();

  // Todas as declarações em state/hooks devem ser feitas antes de qualquer retorno antecipado.
  const [isEditingExternal, setIsEditingExternal] = useState(false);
  const [isEditingInternal, setIsEditingInternal] = useState(false);
  const [editingLink, setEditingLink] = useState<QuickLink | null>(null);
  const [initialized, setInitialized] = useState<string>('');
  const [externalLinks, setExternalLinks] = useState<QuickLink[]>([]);
  const [internalLinks, setInternalLinks] = useState<QuickLink[]>([]);
  const [sectionOrder, setSectionOrder] = useState<'external-first' | 'internal-first'>('external-first');
  const sections = sectionOrder === 'external-first' ? ['external', 'internal'] : ['internal', 'external'];

  // Carregar/recarregar quando o usuário fizer alterações
  useEffect(() => {
    if (!currentUser || initialized === currentUser.id) return;

    const all = filterByProfile(quickLinks, currentUser);
    const defExt = all.filter((l) => l.external);
    const defInt = all.filter((l) => !l.external);
    const saved = loadFromStorage(currentUser.id, defExt, defInt);

    setExternalLinks(saved.external);
    setInternalLinks(saved.internal);
    setIsEditingExternal(false);
    setIsEditingInternal(false);
    setEditingLink(null);
    setInitialized(currentUser.id);
  }, [currentUser, initialized]);

  // Mudanças persistentes
  useEffect(() => {
    if (!currentUser || initialized !== currentUser.id) return;
    saveToStorage(currentUser.id, externalLinks, internalLinks);
  }, [externalLinks, internalLinks, initialized, currentUser]);

  // Manipuladores de movimentação
  const moveExternal = useCallback((from: number, to: number) => {
    setExternalLinks((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const moveInternal = useCallback((from: number, to: number) => {
    setInternalLinks((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  // Manipulador de edição e salvamento
  const handleSaveEdit = useCallback((id: string, title: string, icon: string) => {
    const update = (list: QuickLink[]) =>
      list.map((l) => (l.id === id ? { ...l, title, icon } : l));
    setExternalLinks(update);
    setInternalLinks(update);
    setEditingLink(null);
    toast.success('Link atualizado com sucesso!');
  }, []);

  // Retorno antecipado após hooks
  if (!currentUser) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Carregando...
      </div>
    );
  }

  // Dados derivados (seguros para calcular após null check)
  const allProfileLinks = filterByProfile(quickLinks, currentUser);
  const defaultExternalLinks = allProfileLinks.filter((l) => l.external);
  const defaultInternalLinks = allProfileLinks.filter((l) => !l.external);

  const externalIds = new Set(externalLinks.map((l) => l.id));
  const internalIds = new Set(internalLinks.map((l) => l.id));
  const availableForExternal = defaultExternalLinks.filter((l) => !externalIds.has(l.id));
  const availableForInternal = defaultInternalLinks.filter((l) => !internalIds.has(l.id));

  const profileLabels: Record<string, string> = {
    admin: 'Administrador',
    rh: 'Recursos Humanos',
    servidor: 'Servidor',
    gestor: 'Gestor',
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-8">
        {/* Cbeçalho da página */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Acesso Rápido</h1>
          <p className="text-muted-foreground">
            Links e ferramentas personalizados para seu perfil e setor
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Badge variant="secondary">{profileLabels[currentUser.profile]}</Badge>
            <Badge variant="secondary">{currentUser.sector}</Badge>
            {(isEditingExternal || isEditingInternal) && (
              <Badge className="bg-primary/10 text-primary border-primary/20">
                <Pencil className="size-3 mr-1" />
                Personalizando
              </Badge>
            )}

            <Button
            variant="outline"
            size="sm"
            onClick={() => setSectionOrder((prev) => prev === 'external-first' ? 'internal-first' : 'external-first')}
            className="gap-2 whitespace-nowrap ml-auto"><ArrowUpDown className="size-4"/>Inverter seções</Button>   
          </div>
        </div>

        {/* Seções de links */}
        {sections.map((section) => {
          if (section === 'external') {
            return (
              <QuickLinksSection
                key="external"
                title="Sistemas Externos"
                description="Acesso rápido aos sistemas e portais do governo do ES"
                headerIcon={<ExternalLink className="size-5 text-primary" />}
                links={externalLinks}
                sectionType="external"
                isEditMode={isEditingExternal}
                availableToAdd={availableForExternal}
                currentUserId={currentUser!.id}
                onToggleEdit={() => setIsEditingExternal((v) => !v)}
                onMoveCard={moveExternal}
                onEditLink={setEditingLink}
                onRemoveLink={(id) =>
                  setExternalLinks((prev) => prev.filter((l) => l.id !== id))
                }
                onAddLinks={(links) =>
                  setExternalLinks((prev) => [...prev, ...links])
                }
                onRestoreDefaults={() => setExternalLinks(defaultExternalLinks)}
              />
            );
          }

          return (
            <QuickLinksSection
              key="internal"
              title="Ferramentas Internas"
              description="Acesso às funcionalidades e serviços do portal IPAJM"
              headerIcon={<LinkIcon className="size-5 text-primary" />}
              links={internalLinks}
              sectionType="internal"
              isEditMode={isEditingInternal}
              availableToAdd={availableForInternal}
              currentUserId={currentUser!.id}
              onToggleEdit={() => setIsEditingInternal((v) => !v)}
              onMoveCard={moveInternal}
              onEditLink={setEditingLink}
              onRemoveLink={(id) =>
                setInternalLinks((prev) => prev.filter((l) => l.id !== id))
              }
              onAddLinks={(links) =>
                setInternalLinks((prev) => [...prev, ...links])
              }
              onRestoreDefaults={() => setInternalLinks(defaultInternalLinks)}
            />
          );
        })}

        {/* Edit Link Modal */}
        <EditLinkModal
          link={editingLink}
          onSave={handleSaveEdit}
          onClose={() => setEditingLink(null)}
        />

        {/* Dica útil */}
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-5 pb-5">
            <div className="flex gap-3">
              <SlidersHorizontal className="size-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                <span className="text-foreground font-medium">Dica de personalização:</span>{' '}
                Clique em <strong>Personalizar</strong> em cada seção para arrastar e reordenar os
                cards, editar nome e ícone, ou adicionar/remover links. Apenas os links disponíveis
                para seu perfil podem ser adicionados. As configurações são salvas automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DndProvider>
  );
}