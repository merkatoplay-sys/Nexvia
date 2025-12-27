import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MonitorPlay, Lock, Mail, User } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export default function Login() {
  const { login, register, isLoggingIn, isRegistering } = useAuth();
  const [, setLocation] = useLocation();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isRegisterMode) {
        await register({ email, password, firstName, lastName });
        toast.success('Cuenta creada exitosamente');
      } else {
        await login({ email, password });
        toast.success('Bienvenido a NEXVIA');
      }
      setLocation('/');
    } catch (error: any) {
      const errorMessage = error?.message || 'Error de autenticación';
      toast.error(errorMessage, {
        duration: 4000,
        style: {
          background: '#ef4444',
          color: 'white',
          border: 'none',
        },
      });
    }
  };

  const isLoading = isLoggingIn || isRegistering;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />
      </div>

      <Card className="w-full max-w-md bg-card/50 backdrop-blur-xl border-white/10 relative z-10 shadow-2xl" data-testid="card-login">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-2 border border-primary/20 shadow-[0_0_15px_-3px_rgba(124,58,237,0.3)]">
            <MonitorPlay className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-display font-bold text-white tracking-wide">
              NEX<span className="text-primary">VIA</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              {isRegisterMode ? 'Crear nueva cuenta' : 'Gestión profesional de servicios de streaming'}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white ml-1">Nombre</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Juan"
                      className="pl-10 glass-input h-11"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      data-testid="input-firstname"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white ml-1">Apellido</label>
                  <Input
                    type="text"
                    placeholder="Pérez"
                    className="glass-input h-11"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    data-testid="input-lastname"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-white ml-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  className="pl-10 glass-input h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  data-testid="input-email"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-white ml-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-10 glass-input h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-password"
                />
              </div>
              {isRegisterMode && (
                <p className="text-xs text-muted-foreground ml-1">Mínimo 6 caracteres</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-white h-11 font-medium text-base shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              disabled={isLoading}
              data-testid="button-submit"
            >
              {isLoading 
                ? (isRegisterMode ? 'Creando cuenta...' : 'Iniciando sesión...') 
                : (isRegisterMode ? 'Crear Cuenta' : 'Ingresar al Panel')
              }
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setIsRegisterMode(!isRegisterMode)}
                className="text-sm text-primary hover:underline"
                data-testid="button-toggle-mode"
              >
                {isRegisterMode 
                  ? '¿Ya tienes cuenta? Inicia sesión' 
                  : '¿No tienes cuenta? Regístrate'
                }
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
