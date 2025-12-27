import { useState } from 'react';
import { useStreaming } from '@/context/StreamingContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MonitorPlay, Lock, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Login() {
  const { login, register } = useStreaming();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const success = await login(email, password);
    if (!success) {
      setError('Credenciales inválidas');
    }
    setIsSubmitting(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setIsSubmitting(false);
      return;
    }
    
    const success = await register(email, password);
    if (!success) {
      setError('Error al registrar. El email podría estar en uso.');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <MonitorPlay className="h-10 w-10 text-primary mr-2" />
            <span className="text-3xl font-display font-bold text-white tracking-wider">
              STREAM<span className="text-primary">MGR</span>
            </span>
          </div>
          <p className="text-muted-foreground">Administra tus cuentas de streaming</p>
        </div>

        <Card className="glass-card">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login" data-testid="tab-login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Registrarse</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <CardHeader className="pt-0">
                <CardTitle className="text-white flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" /> Iniciar Sesión
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Correo Electrónico</label>
                    <Input
                      type="email"
                      placeholder="tu@email.com"
                      className="glass-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="input-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Contraseña</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="glass-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      data-testid="input-password"
                    />
                  </div>
                  {error && <p className="text-sm text-red-400 mt-2" data-testid="text-error">{error}</p>}
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-white mt-4"
                    disabled={isSubmitting}
                    data-testid="button-login"
                  >
                    {isSubmitting ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="register">
              <CardHeader className="pt-0">
                <CardTitle className="text-white flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" /> Crear Cuenta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Correo Electrónico</label>
                    <Input
                      type="email"
                      placeholder="tu@email.com"
                      className="glass-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      data-testid="input-register-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-white">Contraseña</label>
                    <Input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      className="glass-input"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      data-testid="input-register-password"
                    />
                  </div>
                  {error && <p className="text-sm text-red-400 mt-2" data-testid="text-register-error">{error}</p>}
                  <Button 
                    type="submit" 
                    className="w-full bg-primary hover:bg-primary/90 text-white mt-4"
                    disabled={isSubmitting}
                    data-testid="button-register"
                  >
                    {isSubmitting ? 'Registrando...' : 'Crear Cuenta'}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>
    </div>
  );
}
