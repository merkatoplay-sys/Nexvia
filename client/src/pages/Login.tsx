import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MonitorPlay, Lock, Mail } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate network delay
    setTimeout(() => {
      login(email, password);
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />
      </div>

      <Card className="w-full max-w-md bg-card/50 backdrop-blur-xl border-white/10 relative z-10 shadow-2xl">
        <CardHeader className="space-y-4 text-center pb-8">
          <div className="mx-auto bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mb-2 border border-primary/20 shadow-[0_0_15px_-3px_rgba(124,58,237,0.3)]">
            <MonitorPlay className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-display font-bold text-white tracking-wide">
              STREAM<span className="text-primary">MGR</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Gestión profesional de servicios de streaming
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white ml-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="admin@ejemplo.com"
                  className="pl-10 glass-input h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                />
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-white h-11 font-medium text-base shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? 'Iniciando sesión...' : 'Ingresar al Panel'}
            </Button>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Acceso exclusivo para administradores
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
