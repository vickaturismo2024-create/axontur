import { useState } from 'react';
import { Plane, Menu, LogOut, User, Moon, Sun, Search } from 'lucide-react';
import { RemindersBadge } from '@/components/reminders/RemindersBadge';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuotesSafe } from '@/contexts/QuotesContext';
import { useTheme } from '@/hooks/useTheme';
import { toast } from 'sonner';

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Plantillas', href: '/templates' },
  { label: 'Clientes', href: '/clients' },
  { label: 'Proveedores', href: '/suppliers' },
  { label: 'Expedientes', href: '/files' },
  { label: 'Reportes', href: '/reportes' },
  { label: 'Mi Agencia', href: '/agency' },
  { label: 'Calendario', href: '/calendar' },
  { label: 'Tutoriales', href: '/tutoriales' },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const quotesContext = useQuotesSafe();
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const defaultTemplate = quotesContext?.getDefaultTemplate();
  const agencyName = defaultTemplate?.agencyName || 'Generador de Presupuestos';

  const handleSignOut = async () => {
    await signOut();
    toast.success('Sesión cerrada');
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <Plane className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-serif text-lg font-semibold text-foreground">{agencyName}</span>
            <span className="text-xs text-muted-foreground">Generador de Presupuestos</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link key={item.href} to={item.href}>
              <Button
                variant={location.pathname === item.href ? 'secondary' : 'ghost'}
                className="text-sm"
              >
                {item.label}
              </Button>
            </Link>
          ))}

          <Button variant="ghost" size="icon" className="ml-1" onClick={() => setSearchOpen(true)} title="Buscar (Ctrl+K)">
            <Search className="h-5 w-5" />
          </Button>

          <Link to="/">
            <Button variant="ghost" size="icon" className="ml-1 relative">
              <RemindersBadge />
            </Button>
          </Link>

          <Button variant="ghost" size="icon" onClick={toggleTheme} className="ml-1">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="ml-2">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">Mi cuenta</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" type="button">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-64">
            <nav className="mt-8 flex flex-col gap-2">
              {navItems.map((item) => (
                <Link key={item.href} to={item.href}>
                  <Button
                    variant={location.pathname === item.href ? 'secondary' : 'ghost'}
                    className="w-full justify-start"
                  >
                    {item.label}
                  </Button>
                </Link>
              ))}

              <Button variant="ghost" className="w-full justify-start" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
              </Button>

              {user && (
                <>
                  <div className="my-4 border-t" />
                  <p className="px-4 text-xs text-muted-foreground">{user.email}</p>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </Button>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}
