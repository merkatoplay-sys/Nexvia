import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MonitorPlay } from 'lucide-react';

export default function Login() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = '/api/login';
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

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
              Gestión profesional de servicios de streaming
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <p className="text-white/80 text-sm">
              Redirigiendo al sistema de autenticación...
            </p>
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="w-full bg-primary hover:bg-primary/90 text-white h-11 font-medium text-base shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
              data-testid="button-login"
            >
              Iniciar Sesión con Replit
            </Button>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Acceso seguro con Google, GitHub, X o Email
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
