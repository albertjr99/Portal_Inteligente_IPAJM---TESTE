import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Calendar,
  Bell,
  HelpCircle,
  FileText,
  Heart,
  Menu,
  X,
  LogOut,
  ChevronDown,
  Link2
} from 'lucide-react';

import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

import { GlobalSearch } from './GlobalSearch';
import { useAuth } from '../contexts/AuthContext';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const location = useLocation();

  const navigation = [
    { name: 'Início', href: '/', icon: Home },
    { name: 'Eventos', href: '/events', icon: Calendar },
    { name: 'Comunicados', href: '/announcements', icon: Bell },
    { name: 'Acesso Rápido', href: '/quick-links', icon: Link2 },
    { name: 'FAQ', href: '/faq', icon: HelpCircle },
    { name: 'Documentos', href: '/documents', icon: FileText },
    { name: 'RH', href: '/hr', icon: Heart },
  ];

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const getInitials = (fullName?: string | null) => {
    if (!fullName) return '';
    return fullName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">

      <div className="container mx-auto px-4">

        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <div className="h-10 flex items-center">
            <img
              src="/assets/logo-ipajm.png"
              alt="Logo IPAJM"
              className="h-full w-auto drop-shadow-sm"
            />
          </div>
          {/* <Link to="/" className="flex items-center gap-3">

            <div className="size-10 rounded-lg overflow-hidden bg-white flex items-center justify-center border border-green-700">
              <img
                src="/assets/logo-ipajm.png"
                alt="Logo IPAJM"
                className="size-full object-contain"
              />
            </div>

            <div className="hidden sm:block">
              <div className="font-bold text-lg leading-none text-green-900">
                IPAJM
              </div>
              <div className="text-xs text-muted-foreground">
                Portal de Serviços
              </div>
            </div>

          </Link> */}

          {/* Navegação Desktop */}
          <nav className="hidden lg:flex items-center gap-1">

            {navigation.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive(item.href)
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent'
                    }`}
                >
                  <Icon className="size-4" />
                  {item.name}
                </Link>
              );
            })}

          </nav>

          {/* Pesquisar + Usuário */}
          <div className="flex items-center gap-4">

            <div className="hidden md:block">
              <GlobalSearch />
            </div>

            {currentUser && (
              <DropdownMenu>

                <DropdownMenuTrigger asChild>

                  <Button variant="ghost" className="flex items-center gap-2">

                    <Avatar className="size-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(currentUser.fullName)}
                      </AvatarFallback>
                    </Avatar>

                    <span className="hidden sm:inline text-sm">
                      {currentUser.firstName}
                    </span>

                    <ChevronDown className="size-4" />

                  </Button>

                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" className="w-auto min-w-50 max-w-[320px] whitespace-normal">

                  <DropdownMenuLabel>

                    <div className="flex flex-col">
                      <span className="wrap-break-word">{currentUser.fullName}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {currentUser.department}
                      </span>
                    </div>

                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 size-4" />
                    Sair
                  </DropdownMenuItem>

                </DropdownMenuContent>

              </DropdownMenu>
            )}

            {/* Menu Mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >

              {mobileMenuOpen ? (
                <X className="size-5" />
              ) : (
                <Menu className="size-5" />
              )}

            </Button>

          </div>

        </div>

        {/* Navegação Mobile */}
        {mobileMenuOpen && (

          <div className="lg:hidden border-t py-4">

            <div className="md:hidden mb-4">
              <GlobalSearch />
            </div>

            <nav className="flex flex-col gap-2">

              {navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors ${isActive(item.href)
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                      }`}
                  >
                    <Icon className="size-5" />
                    {item.name}
                  </Link>
                );
              })}

            </nav>

          </div>

        )}

      </div>

    </header>
  );
}