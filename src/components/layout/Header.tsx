import { useState, useEffect, useMemo } from 'react';
import { Plane, Menu, LogOut, User, Moon, Sun, Search, Download } from 'lucide-react';
import { RemindersBadge } from '@/components/reminders/RemindersBadge';
import { GlobalSearch } from '@/components/layout/GlobalSearch';
import { InfraHealthDot } from '@/components/layout/InfraHealthDot';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { usePermissions } from '@/hooks/usePermissions';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const navItems = [
  { label: 'Dashboard', href: '/' },
  { label: 'Presupuestos', href: '/quotes' },
  { label: 'Plantillas', href: '/templates' },
  { label: 'Clientes', href: '/clients' },
  { label: 'Proveedores', href: '/suppliers' },
  { label: 'Expedientes', href: '/files' },
  { label: 'Vuelos', href: '/reservations' },
  { label: 'Cuentas Ctes.', href: '/accounts' },
  { label: 'Caja', href: '/caja' },
  { label: 'Reportes', href: '/reportes' },
  { label: 'Importación', href: '/importar' },
  { label: 'Configuración', href: '/settings' },
  { label: 'Calendario', href: '/calendar' },
  { label: 'Tutoriales', href: '/tutoriales' },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isAdmin, role } = usePermissions();
  const quotesContext = useQuotesSafe();
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const defaultTemplate = quotesContext?.getDefaultTemplate();
  const agencyName = defaultTemplate?.agencyName || 'AxonTur';

  const handleSignOut = async () => {
    await signOut();
    toast.success('Sesión cerrada');
    navigate('/auth');
  };

  const [menuOpen, setMenuOpen] = useState(false);

  // PWA installation helper
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showIOSInstallInfo, setShowIOSInstallInfo] = useState(false);
  const [showGenericInstallInfo, setShowGenericInstallInfo] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const isIOS = useMemo(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  }, []);

  const isStandalone = useMemo(() => {
    return window.matchMedia('(display-mode: standalone)').matches || 
           (window.navigator as any).standalone === true;
  }, []);

  const showInstallButton = useMemo(() => {
    return !isStandalone;
  }, [isStandalone]);

  const handleInstallClick = async () => {
    setMenuOpen(false);
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
      return;
    }

    if (isIOS) {
      setShowIOSInstallInfo(true);
      return;
    }

    setShowGenericInstallInfo(true);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/80 backdrop-blur-lg">
      <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-3 sm:px-4">
        {/* Menu trigger (always visible) + Logo */}
        <div className="flex items-center gap-2 min-w-0 flex-1 md:flex-none">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" type="button" className="shrink-0" title="Menú">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 flex flex-col">
              <div className="px-4 pt-6 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden shrink-0 border border-primary/20">
                    <img src="/pwa-192x192.png" alt="Logo" className="h-full w-full object-cover" />
                  </div>
                  <SheetTitle className="text-base font-semibold text-foreground truncate m-0">
                    {agencyName}
                  </SheetTitle>
                </div>
              </div>

              <ScrollArea className="flex-1">
                <nav className="flex flex-col gap-1 p-3">
                  {navItems.map((item) => (
                    <Link key={item.href} to={item.href} onClick={() => setMenuOpen(false)}>
                      <Button
                        variant={location.pathname === item.href ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                      >
                        {item.label}
                      </Button>
                    </Link>
                  ))}

                  <div className="my-2 border-t" />

                  <Button variant="ghost" className="w-full justify-start" onClick={toggleTheme}>
                    {theme === 'dark' ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                    {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
                  </Button>

                  {showInstallButton && (
                    <Button variant="ghost" className="w-full justify-start text-primary font-medium" onClick={handleInstallClick}>
                      <Download className="mr-2 h-4 w-4" />
                      Instalar Aplicación
                    </Button>
                  )}

                  {user && (
                    <>
                      <div className="my-2 border-t" />
                      <p className="px-4 py-2 text-xs text-muted-foreground truncate">{user.email}</p>
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
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link to="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg overflow-hidden shrink-0 border border-primary/20">
                <img src="/pwa-192x192.png" alt="Logo" className="h-full w-full object-cover" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-base sm:text-lg font-semibold text-foreground truncate">
                  {agencyName}
                </span>
              </div>
            </Link>
            <div className="flex items-center mt-1">
              <InfraHealthDot />
            </div>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setSearchOpen(true)} title="Buscar (Ctrl+K)">
            <Search className="h-5 w-5" />
          </Button>

          <Link to="/">
            <Button variant="ghost" size="icon" className="h-9 w-9 relative" title="Recordatorios">
              <RemindersBadge />
            </Button>
          </Link>

          <Button variant="ghost" size="icon" className="h-9 w-9 hidden md:inline-flex" onClick={toggleTheme} title="Cambiar tema">
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 hidden md:inline-flex" title="Mi cuenta">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">Mi cuenta</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    {role && (
                      <Badge variant={isAdmin ? 'default' : 'secondary'} className="w-fit text-[10px] mt-1">
                        {isAdmin ? 'Administrador' : 'Vendedor'}
                      </Badge>
                    )}
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
        </div>
      </div>
      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />

      <Dialog open={showIOSInstallInfo} onOpenChange={setShowIOSInstallInfo}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center font-serif text-lg text-primary flex items-center justify-center gap-2">
              <Plane className="h-5 w-5 text-primary" /> Instalar AxonTur
            </DialogTitle>
            <DialogDescription className="text-center text-xs mt-2">
              Sigue estos sencillos pasos para tener la aplicación en tu pantalla de inicio en iPhone o iPad:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</span>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Toca el botón de <strong>Compartir</strong> en la barra inferior de Safari (el ícono de un cuadrado con una flecha hacia arriba ⬆️).
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</span>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Desplázate hacia abajo y selecciona la opción <strong>"Agregar a pantalla de inicio"</strong>.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</span>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Presiona <strong>"Agregar"</strong> en la esquina superior derecha para confirmar. ¡Listo!
              </p>
            </div>
          </div>
          <div className="flex justify-center mt-2">
            <Button className="w-full rounded-xl" onClick={() => setShowIOSInstallInfo(false)}>
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showGenericInstallInfo} onOpenChange={setShowGenericInstallInfo}>
        <DialogContent className="max-w-xs sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center font-serif text-lg text-primary flex items-center justify-center gap-2">
              <Plane className="h-5 w-5 text-primary" /> Instalar AxonTur
            </DialogTitle>
            <DialogDescription className="text-center text-xs mt-2">
              Puedes instalar AxonTur en tu dispositivo para usarlo como una aplicación nativa:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">🖥️</span>
              <div>
                <h4 className="font-semibold text-xs text-foreground">En Computadora (PC/Mac):</h4>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Busca el ícono de instalación (un monitor con una flecha hacia abajo ⬇️) en la barra de direcciones arriba a la derecha, o abre el menú del navegador (tres puntos) y haz clic en <strong>"Instalar AxonTur"</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">📱</span>
              <div>
                <h4 className="font-semibold text-xs text-foreground">En Celular (Android):</h4>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  Abre el menú de opciones de tu navegador (los tres puntos arriba a la derecha) y selecciona <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-center mt-2">
            <Button className="w-full rounded-xl" onClick={() => setShowGenericInstallInfo(false)}>
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
