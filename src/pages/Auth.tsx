import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Compass } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ email: '', password: '', confirmPassword: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginData.email || !loginData.password) {
      toast.error('Por favor, completá todos los campos');
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('¡Bienvenido!');
      navigate('/');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerData.email || !registerData.password || !registerData.confirmPassword) {
      toast.error('Por favor, completá todos los campos');
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (registerData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(registerData.email, registerData.password);
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('¡Cuenta creada! Ya podés iniciar sesión');
      navigate('/');
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Lado Izquierdo - Visual e Inspirador (Oculto en pantallas pequeñas) */}
      <div 
        className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center items-center justify-center p-12 overflow-hidden"
        style={{ backgroundImage: `url('/login_travel_bg.png')` }}
      >
        {/* Filtro degradado premium */}
        <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--navy-dark))]/90 via-[hsl(var(--navy))]/70 to-transparent" />
        
        {/* Decoración geométrica */}
        <div className="absolute top-12 left-12 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute bottom-12 right-12 h-64 w-64 rounded-full bg-[hsl(var(--gold))]/10 blur-3xl" />

        {/* Tarjeta Glassmorphic */}
        <div className="relative max-w-lg w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 sm:p-10 shadow-2xl text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--gold))]/20 border border-[hsl(var(--gold))]/40 mb-6 text-[hsl(var(--gold))]">
            <Compass className="h-6 w-6 animate-pulse" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            AxonTur V2
          </h1>
          <p className="text-white/80 text-sm leading-relaxed mb-6 font-light">
            "Conectando destinos, simplificando tu gestión. La herramienta definitiva de presupuestación y control de expedientes de viaje para agencias premium."
          </p>
          <div className="flex items-center gap-3 border-t border-white/10 pt-6">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="text-xs text-white/60 uppercase tracking-widest font-medium">
              Listo para operar
            </span>
          </div>
        </div>
      </div>

      {/* Lado Derecho - Formulario de Acceso */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-[hsl(var(--navy-dark))] via-[hsl(var(--navy))] to-[hsl(var(--navy-dark))] relative overflow-hidden">
        {/* Luces de ambiente premium en el fondo */}
        <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-[hsl(var(--gold))]/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-[hsl(var(--primary))]/10 blur-3xl pointer-events-none" />

        <Card className="w-full max-w-md shadow-premium border-white/10 bg-white/5 backdrop-blur-lg text-white animate-fadeInUp relative z-10">
          <CardHeader className="text-center pb-4">
            {/* Logo de AxonTur visible en móvil con colores dorados premium */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[hsl(var(--gold))]/10 border border-[hsl(var(--gold))]/20 text-[hsl(var(--gold))] lg:hidden shadow-sm">
              <Compass className="h-7 w-7 text-[hsl(var(--gold))] animate-pulse" />
            </div>
            
            <CardTitle className="text-2xl sm:text-3xl text-white font-bold">
              Bienvenido a AxonTur
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-white/70 mt-1">
              Ingresá al ERP para gestionar tus clientes, caja y expedientes.
            </CardDescription>
          </CardHeader>

          <Tabs defaultValue="login" className="w-full">
            <div className="px-6">
              <TabsList className="grid w-full grid-cols-2 bg-white/10 p-1 rounded-xl">
                <TabsTrigger value="login" className="rounded-lg text-xs font-semibold text-white/60 data-[state=active]:bg-white/15 data-[state=active]:text-white transition-all">Iniciar Sesión</TabsTrigger>
                <TabsTrigger value="register" className="rounded-lg text-xs font-semibold text-white/60 data-[state=active]:bg-white/15 data-[state=active]:text-white transition-all">Registrarse</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="login" className="mt-4">
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email" className="text-xs font-medium text-white/80">Correo Electrónico</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="ejemplo@agencia.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      disabled={isLoading}
                      className="h-10 text-xs bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-[hsl(var(--gold))] focus:ring-1 focus:ring-[hsl(var(--gold))] transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password" className="text-xs font-medium text-white/80">Contraseña</Label>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      disabled={isLoading}
                      className="h-10 text-xs bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-[hsl(var(--gold))] focus:ring-1 focus:ring-[hsl(var(--gold))] transition-all"
                    />
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button type="submit" className="w-full h-10 text-xs font-bold bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--accent))] hover:opacity-90 text-[hsl(var(--navy-dark))] border-none shadow-gold hover:scale-[1.01] transition-all" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-[hsl(var(--navy-dark))]" />
                        Ingresando...
                      </>
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="register" className="mt-4">
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="register-email" className="text-xs font-medium text-white/80">Correo Electrónico</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="ejemplo@agencia.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      disabled={isLoading}
                      className="h-10 text-xs bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-[hsl(var(--gold))] focus:ring-1 focus:ring-[hsl(var(--gold))] transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="register-password" className="text-xs font-medium text-white/80">Contraseña</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      disabled={isLoading}
                      className="h-10 text-xs bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-[hsl(var(--gold))] focus:ring-1 focus:ring-[hsl(var(--gold))] transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="register-confirm" className="text-xs font-medium text-white/80">Confirmar Contraseña</Label>
                    <Input
                      id="register-confirm"
                      type="password"
                      placeholder="Repetir contraseña"
                      value={registerData.confirmPassword}
                      onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                      disabled={isLoading}
                      className="h-10 text-xs bg-white/5 border-white/10 text-white placeholder-white/30 focus:border-[hsl(var(--gold))] focus:ring-1 focus:ring-[hsl(var(--gold))] transition-all"
                    />
                  </div>
                </CardContent>
                <CardFooter className="pt-2">
                  <Button type="submit" className="w-full h-10 text-xs font-bold bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--accent))] hover:opacity-90 text-[hsl(var(--navy-dark))] border-none shadow-gold hover:scale-[1.01] transition-all" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-[hsl(var(--navy-dark))]" />
                        Creando cuenta...
                      </>
                    ) : (
                      'Crear Cuenta'
                    )}
                  </Button>
                </CardFooter>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
